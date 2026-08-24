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

fastify.post('/consultations', { schema: { body: { type: 'object', properties: { patientId: { type: 'string' }, doctorId: { type: 'string' }, notes: { type: 'string' } } } }}, async (request, reply) => {
  await reply.send({ message: 'Create consultation - ' + JSON.stringify(request.body) });
});

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'consultation-service' };
});

const port = Number(process.env['PORT'] ?? 5008);

fastify.listen({ port, host: '0.0.0.0' }).catch((error: unknown) => {
  fastify.log.error(error);
  process.exit(1);
});