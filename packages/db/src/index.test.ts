import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearClientCache,
  withSchemaParam,
  ScopedRepository,
  type ModelDelegate,
} from './index.js';

describe('clientFor URL handling', () => {
  afterEach(async () => {
    await clearClientCache();
  });

  it('withSchemaParam preserves existing query parameters when adding schema', () => {
    const urlWithParams = 'postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=10';
    const result = withSchemaParam(urlWithParams, 'identity');
    const parsed = new URL(result);
    expect(parsed.searchParams.get('schema')).toBe('identity');
    expect(parsed.searchParams.get('sslmode')).toBe('require');
    expect(parsed.searchParams.get('connection_limit')).toBe('10');
  });

  it('withSchemaParam works with URL without query parameters', () => {
    const urlWithoutParams = 'postgresql://user:pass@host:5432/db';
    const result = withSchemaParam(urlWithoutParams, 'identity');
    const parsed = new URL(result);
    expect(parsed.searchParams.get('schema')).toBe('identity');
    expect(parsed.searchParams.toString()).toBe('schema=identity');
  });

  it('withSchemaParam replaces existing schema parameter', () => {
    const urlWithSchema = 'postgresql://user:pass@host:5432/db?schema=public';
    const result = withSchemaParam(urlWithSchema, 'identity');
    const parsed = new URL(result);
    expect(parsed.searchParams.get('schema')).toBe('identity');
  });
});

describe('ScopedRepository prevents unscoped queries', () => {
  interface TestRecord {
    id: string;
    hospitalId: string;
    name: string;
  }

  type Args = Record<string, unknown>;

  class TestRepository extends ScopedRepository<TestRecord> {
    private mockDelegate: ModelDelegate<TestRecord>;

    constructor(hospitalId: string) {
      const delegate: ModelDelegate<TestRecord> = {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      };
      super(delegate, hospitalId);
      this.mockDelegate = delegate;
    }

    getDelegate<K extends keyof ModelDelegate<TestRecord>>(
      method: K,
    ): ModelDelegate<TestRecord>[K] {
      return this.mockDelegate[method];
    }

    async testFindFirst(args?: { where?: Args }) {
      return this.findFirst(args);
    }

    async testFindMany(args?: { where?: Args }) {
      return this.findMany(args);
    }

    async testCreate(args: { data: Args }) {
      return this.create(args);
    }

    async testUpdate(args: { where: Args; data: Args }) {
      return this.update(args);
    }

    async testDelete(args: { where: Args }) {
      return this.delete(args);
    }

    async testCount(args?: { where?: Args }) {
      return this.count(args);
    }
  }

  let repo: TestRepository;

  beforeEach(() => {
    repo = new TestRepository('hospital-123');
  });

  it('injects hospitalId into findFirst where clause', async () => {
    await repo.testFindFirst({ where: { name: 'test' } });
    expect(repo.getDelegate('findFirst')).toHaveBeenCalledWith({
      where: { name: 'test', hospitalId: 'hospital-123' },
    });
  });

  it('injects hospitalId into findMany where clause', async () => {
    await repo.testFindMany({ where: { name: 'test' } });
    expect(repo.getDelegate('findMany')).toHaveBeenCalledWith({
      where: { name: 'test', hospitalId: 'hospital-123' },
    });
  });

  it('injects hospitalId into create data', async () => {
    await repo.testCreate({ data: { name: 'test' } });
    expect(repo.getDelegate('create')).toHaveBeenCalledWith({
      data: { name: 'test', hospitalId: 'hospital-123' },
    });
  });

  it('injects hospitalId into update where clause (not data)', async () => {
    await repo.testUpdate({ where: { id: 'user-1' }, data: { name: 'updated' } });
    expect(repo.getDelegate('update')).toHaveBeenCalledWith({
      where: { id: 'user-1', hospitalId: 'hospital-123' },
      data: { name: 'updated' },
    });
  });

  it('injects hospitalId into delete where clause', async () => {
    await repo.testDelete({ where: { id: 'user-1' } });
    expect(repo.getDelegate('delete')).toHaveBeenCalledWith({
      where: { id: 'user-1', hospitalId: 'hospital-123' },
    });
  });

  it('injects hospitalId into count where clause', async () => {
    await repo.testCount({ where: { name: 'test' } });
    expect(repo.getDelegate('count')).toHaveBeenCalledWith({
      where: { name: 'test', hospitalId: 'hospital-123' },
    });
  });

  it('does not expose raw prisma client to subclass', () => {
    // The ScopedRepository accepts a ModelDelegate, not a PrismaClient.
    // A subclass cannot reach another model or open an unscoped query
    // because it only has the delegate it was given. This is the compile-time
    // guarantee; the runtime guarantee is that #delegate and #hospitalId are
    // true private fields inaccessible from outside the class body.
    expect('prisma' in repo).toBe(false);
  });

  it('throws when constructed without hospitalId', () => {
    expect(() => new TestRepository('')).toThrow('ScopedRepository requires a hospitalId');
  });
});
