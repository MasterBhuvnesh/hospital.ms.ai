import fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const app = fastify();

app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'api-gateway' };
});

app.get('/', async (request, reply) => {
  return { message: 'API Gateway is running' };
});

const port = process.env.PORT || 4000;

app.listen({ port: Number(port), host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`api-gateway running on port ${port}`);
});