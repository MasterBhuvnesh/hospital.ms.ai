// =============================================================================
//  Entrypoint for the all-in-one image (hms-platform).
//
//  One image, and SERVICES decides how much of the platform this container is:
//
//      (nothing set)                      every service, one process. single-host
//      SERVICES=gateway,identity,comms    a subset, one process
//      SERVICES=ai                        one service, to keep CPU work off the
//                                         event loop the queue runs on
//      SERVICE=scheduling PORT=5003       one service, the Kubernetes form
//
//  Plain .mjs on purpose. This is an image entrypoint, not library code, so it
//  is not a workspace member and has no build step: the image copies apps/*/dist
//  and node runs this file directly.
// =============================================================================

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APPS = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps');

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

// A backend service is any app whose manifest declares hms.port. That is already
// the convention in all eight manifests, so the catalogue has one home instead of
// two, and extracting a ninth service out of clinical needs no edit here.
async function discover() {
  const catalogue = new Map();
  for (const name of await readdir(APPS)) {
    try {
      const manifest = JSON.parse(await readFile(join(APPS, name, 'package.json'), 'utf8'));
      if (typeof manifest.hms?.port === 'number') catalogue.set(name, manifest.hms.port);
    } catch {
      // No manifest, or no hms.port: a client app, not a service. Skip it.
    }
  }
  return catalogue;
}

const catalogue = await discover();
if (catalogue.size === 0) fail(`No services found under ${APPS}`);

// SERVICE (singular) is the Kubernetes and per-service form and wins when set, so
// the documented `docker run -e SERVICE=scheduling -e PORT=5003` keeps working and
// Helm's image.mode=all-in-one needs no change.
const single = process.env.SERVICE?.trim();
const requested = (single ?? process.env.SERVICES ?? [...catalogue.keys()].join(','))
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

const unknown = requested.filter((name) => !catalogue.has(name));
if (unknown.length > 0) {
  // Fail before binding anything. A container that silently serves seven of the
  // eight services it was asked for is worse than one that refuses to start.
  fail(`Unknown service(s): ${unknown.join(', ')}\nKnown: ${[...catalogue.keys()].join(', ')}`);
}
if (requested.length === 0) fail('SERVICES resolved to an empty list');

const started = [];

for (const name of requested) {
  // An explicit PORT only makes sense for a single service. With several in one
  // process it would collide, so the manifest wins.
  const port = single && process.env.PORT ? Number(process.env.PORT) : catalogue.get(name);

  const { buildApp } = await import(`../apps/${name}/dist/app.js`);
  const app = buildApp();

  await app.listen({ port, host: '0.0.0.0' });
  // Written here rather than through app.log, because buildApp constructs Fastify
  // with `logger: false` and an unlogged startup is an undebuggable container.
  // A service name and a port are not PHI; nothing else is printed.
  process.stdout.write(`listening  ${name.padEnd(11)} :${port}\n`);
  started.push(app);
}

// Every service here shares one event loop, so shutdown is all or nothing. Close
// them in parallel and give the orchestrator a clean exit code either way.
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    Promise.allSettled(started.map((app) => app.close())).then(() => process.exit(0));
  });
}
