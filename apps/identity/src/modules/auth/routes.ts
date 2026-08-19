import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyAccessToken } from '@hms/auth';
import { createErrorEnvelope, ERROR_CODE_TO_STATUS } from '@hms/contracts';
import { AuthError, type AuthService, type RequestContext } from './service.js';
import {
  LoginRequest,
  OtpRequest,
  OtpVerifyRequest,
  RefreshRequest,
  RegisterRequest,
} from './schemas.js';

export interface RouteDeps {
  service: AuthService;
  jwtPublicKey: string;
  jwtIssuer: string;
  jwtAudience: string;
}

function contextOf(request: FastifyRequest): RequestContext {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
    correlationId: (request.headers['x-correlation-id'] as string | undefined) ?? null,
  };
}

/**
 * A destination is exactly one of email or phone. The zod schemas already
 * guarantee at least one is present; this picks which one the service acts on,
 * preferring phone because it is the primary channel for this product.
 */
function destinationOf(input: { email?: string | undefined; phone?: string | undefined }): {
  destination: string;
  type: 'email' | 'phone';
} {
  return input.phone !== undefined
    ? { destination: input.phone, type: 'phone' }
    : { destination: input.email as string, type: 'email' };
}

function fail(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AuthError) {
    return reply
      .code(ERROR_CODE_TO_STATUS[error.code])
      .send(createErrorEnvelope(error.code, error.message));
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send(
      createErrorEnvelope(
        'VALIDATION_ERROR',
        'Request body is invalid',
        // zod types an issue path as PropertyKey[], but the shared ErrorDetail
        // contract is (string | number)[]. A symbol key cannot occur for a
        // parsed JSON body, so filtering them out loses nothing and keeps the
        // envelope honest about its own type.
        error.issues.map((issue) => ({
          path: issue.path.filter((p): p is string | number => typeof p !== 'symbol'),
          message: issue.message,
        })),
      ),
    );
  }
  throw error;
}

export function registerAuthRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { service } = deps;

  /**
   * Verifies the bearer token with the PUBLIC key, exactly as any other service
   * would. identity holds the private key, but using it to verify here would
   * mean this code path is the one that is never exercised the way the rest of
   * the platform exercises it.
   */
  async function requireBearer(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<string | null> {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      await reply
        .code(401)
        .send(createErrorEnvelope('UNAUTHENTICATED', 'A bearer token is required'));
      return null;
    }

    try {
      const claims = await verifyAccessToken(deps.jwtPublicKey, header.slice(7), {
        issuer: deps.jwtIssuer,
        audience: deps.jwtAudience,
      });
      return claims.sub;
    } catch {
      // Never say WHY the token failed. "Expired" versus "bad signature" tells
      // an attacker whether they hold a real token.
      await reply.code(401).send(createErrorEnvelope('UNAUTHENTICATED', 'Invalid token'));
      return null;
    }
  }

  app.post('/auth/register', async (request, reply) => {
    try {
      const body = RegisterRequest.parse(request.body);
      return await reply.code(201).send(await service.register(body, contextOf(request)));
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.post('/auth/login', async (request, reply) => {
    try {
      const body = LoginRequest.parse(request.body);
      return await reply.send(await service.login(body, contextOf(request)));
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.post('/auth/otp/request', async (request, reply) => {
    try {
      const body = OtpRequest.parse(request.body);
      await service.requestOtp(destinationOf(body), body.purpose, contextOf(request));
      // 202 with no body whether or not the account exists. A 404 here would be
      // a free account-enumeration endpoint.
      return await reply.code(202).send();
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.post('/auth/otp/verify', async (request, reply) => {
    try {
      const body = OtpVerifyRequest.parse(request.body);
      return await reply.send(
        await service.verifyOtp(destinationOf(body), body.code, body.purpose, contextOf(request)),
      );
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.post('/auth/refresh', async (request, reply) => {
    try {
      const body = RefreshRequest.parse(request.body);
      return await reply.send(await service.refresh(body.refreshToken, contextOf(request)));
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.post('/auth/logout', async (request, reply) => {
    try {
      const body = RefreshRequest.parse(request.body);
      await service.logout(body.refreshToken, contextOf(request));
      return await reply.code(204).send();
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.get('/auth/me', async (request, reply) => {
    const userId = await requireBearer(request, reply);
    if (userId === null) return reply;

    try {
      return await reply.send(await service.profile(userId));
    } catch (error) {
      return fail(reply, error);
    }
  });
}
