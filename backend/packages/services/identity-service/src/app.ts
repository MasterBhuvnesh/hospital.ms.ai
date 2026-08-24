import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: false });

fastify.decorate('validateBody', (schema: any) => {
  return async (request: any, reply: any) => {
    const result = schema.validate(request.body, { abortEarly: false });
    if (result.error) {
      reply.code(400).send(result.error.details.map((d: any) => d.message).join(', '));
    }
  };
});

fastify.post('/register', { schema: { body: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } }}, async (request, reply) => {
  await reply.send({ message: 'Register endpoint - to be implemented' });
});

fastify.post('/login', { schema: { body: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } }}, async (request, reply) => {
  await reply.send({ message: 'Login endpoint - to be implemented' });
});

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'identity-service' };
});

const port = Number(process.env.PORT || 5001);

fastify.listen({ port, host: '0.0.0.0' }).catch((err: unknown) => {
  fastify.log.error(err);
  process.exit(1);
});
