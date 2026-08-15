# packages/contracts

The spine of the monorepo.

Zod schemas and the types inferred from them. One schema produces the runtime request validation, the TypeScript request and response types, the client-side form validation, and the OpenAPI document.

**Add the schema before the handler.** A contract change fails CI in every consumer at once, which is the point.

Nothing in here imports a service, a database client, or a framework. It must be importable from a browser, from React Native, and from a service.

Imported as `@hms/contracts`.
