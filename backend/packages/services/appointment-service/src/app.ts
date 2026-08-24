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

fastify.post('/appointments', { schema: { body: { type: 'object', properties: { patientId: { type: 'string' }, date: { type: 'string' } } } }}, async (request, reply) => {
  await reply.send({ message: 'Create appointment - ' + JSON.stringify(request.body) });
});

fastify.get('/appointments', async (request, reply) => {
  await reply.send({ message: 'List appointments - to be implemented' });
});

fastify.get('/appointments/:id', async (request, reply) => {
  await reply.send({ message: 'Get appointment ' + request.params.id });
});

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'appointment-service' };
});

const port = Number(process.env['PORT'] ?? 5005);

fastify.listen({ port, host: '0.0.0.0' }).catch((error: unknown) => {
  fastify.log.error(error);
  process.exit(1);
});