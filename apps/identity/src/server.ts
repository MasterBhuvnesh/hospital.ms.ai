import { buildApp } from './app.js';

const port = Number(process.env['PORT'] ?? 5001);
const app = buildApp();

app.listen({ port, host: '0.0.0.0' }).catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});
