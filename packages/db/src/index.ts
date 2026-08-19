import type { PrismaClient } from '@prisma/client';

type PrismaClientConstructor = new (options?: { datasourceUrl?: string }) => PrismaClient;

const clientCache = new Map<string, PrismaClient>();
let PrismaClientClass: PrismaClientConstructor | null = null;

// Imported lazily because the generated client does not exist until
// `prisma generate` has run, and importing it eagerly would break the build of
// every package that merely depends on this one.
async function getPrismaClientClass(): Promise<PrismaClientConstructor> {
  PrismaClientClass ??= (await import('@prisma/client')).PrismaClient as PrismaClientConstructor;
  return PrismaClientClass;
}

/**
 * Adds `?schema=` without destroying a query string that is already there.
 *
 * String concatenation is wrong here: managed Postgres connection strings
 * usually arrive carrying `?sslmode=require`, and a second `?` produces a URL
 * that fails to connect with an error that never mentions this function.
 */
export function withSchemaParam(url: string, schema: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('schema', schema);
  return parsed.toString();
}

/**
 * One client per schema.
 *
 * A factory rather than a module-level singleton keyed off `process.env.SERVICE`,
 * because several services share one process in the single-host deployment and a
 * singleton would hand `clinical` the `scheduling` schema. The caller names its
 * own schema; nothing here reads the environment.
 */
export async function clientFor(schema: string, databaseUrl: string): Promise<PrismaClient> {
  const cached = clientCache.get(schema);
  if (cached) return cached;

  const ClientClass = await getPrismaClientClass();
  const client = new ClientClass({ datasourceUrl: withSchemaParam(databaseUrl, schema) });

  clientCache.set(schema, client);
  return client;
}

export async function clearClientCache(): Promise<void> {
  await Promise.all([...clientCache.values()].map((client) => client.$disconnect()));
  clientCache.clear();
}

type Args = Record<string, unknown>;

/**
 * The subset of a Prisma model delegate that a scoped repository may use.
 *
 * Hand-written rather than imported, because the generated client does not exist
 * yet. Narrow on purpose: `findUnique` is absent because a bare unique lookup
 * cannot be hospital-scoped, and offering it would be offering a hole.
 */
export interface ModelDelegate<TRecord> {
  findFirst(args?: { where?: Args }): Promise<TRecord | null>;
  findMany(args?: { where?: Args }): Promise<TRecord[]>;
  create(args: { data: Args }): Promise<TRecord>;
  update(args: { where: Args; data: Args }): Promise<TRecord>;
  delete(args: { where: Args }): Promise<TRecord>;
  count(args?: { where?: Args }): Promise<number>;
}

/**
 * Base for every repository over a hospital-scoped table.
 *
 * Architecture 5.2 puts `hospitalId` scoping in the repository layer rather than
 * in route handlers, "because a handler that forgets it is a cross-tenant data
 * leak rather than a bug". This class is what makes forgetting impossible.
 *
 * Two decisions carry that guarantee:
 *
 * A subclass receives **one model delegate, never the PrismaClient**. It cannot
 * reach another model, and it cannot open an unscoped query, because it has no
 * object that could answer one.
 *
 * The delegate and the hospital id are `#private` fields rather than `private`.
 * TypeScript's `private` is erased at compile time and `(repo as never).prisma`
 * retrieves it at runtime; a `#` field is genuinely unreachable from outside the
 * class body. For a tenancy boundary the runtime guarantee is the one that
 * counts.
 */
export abstract class ScopedRepository<TRecord> {
  readonly #delegate: ModelDelegate<TRecord>;
  readonly #hospitalId: string;

  protected constructor(delegate: ModelDelegate<TRecord>, hospitalId: string) {
    if (!hospitalId) throw new Error('ScopedRepository requires a hospitalId');
    this.#delegate = delegate;
    this.#hospitalId = hospitalId;
  }

  protected get hospitalId(): string {
    return this.#hospitalId;
  }

  /**
   * The scope is applied last, so a caller-supplied `hospitalId` cannot widen or
   * redirect it. A request body carrying another hospital's id is the exact
   * shape of the IDOR this class exists to stop, and spreading in the other
   * order would honour it.
   */
  #scope(where?: Args): Args {
    return { ...where, hospitalId: this.#hospitalId };
  }

  protected findFirst(args?: { where?: Args }): Promise<TRecord | null> {
    return this.#delegate.findFirst({ ...args, where: this.#scope(args?.where) });
  }

  protected findMany(args?: { where?: Args }): Promise<TRecord[]> {
    return this.#delegate.findMany({ ...args, where: this.#scope(args?.where) });
  }

  protected create(args: { data: Args }): Promise<TRecord> {
    return this.#delegate.create({ ...args, data: this.#scope(args.data) });
  }

  protected update(args: { where: Args; data: Args }): Promise<TRecord> {
    // `data` is deliberately NOT scoped: hospitalId is set at creation and an
    // update must never move a record between hospitals.
    return this.#delegate.update({ ...args, where: this.#scope(args.where) });
  }

  protected delete(args: { where: Args }): Promise<TRecord> {
    return this.#delegate.delete({ ...args, where: this.#scope(args.where) });
  }

  protected count(args?: { where?: Args }): Promise<number> {
    return this.#delegate.count({ ...args, where: this.#scope(args?.where) });
  }
}

/**
 * Base for repositories over the global tables: `users`, `patients`, and the
 * clinical truth about a person, which architecture 5.2 lists as having no
 * `hospitalId` at all.
 *
 * Global storage is not global visibility. A hospital reaches a patient's
 * history through an active consultation or an explicit grant, and that check
 * belongs to `clinical`, not here.
 */
export abstract class GlobalRepository<TRecord> {
  readonly #delegate: ModelDelegate<TRecord>;

  protected constructor(delegate: ModelDelegate<TRecord>) {
    this.#delegate = delegate;
  }

  protected get delegate(): ModelDelegate<TRecord> {
    return this.#delegate;
  }
}
