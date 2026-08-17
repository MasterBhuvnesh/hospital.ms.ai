import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request context carried through every log line without being passed as an
 * argument to every function. Correlating a request across eight services means
 * every line it produces has to carry the same id, and threading that by hand
 * fails the moment somebody forgets.
 */
export interface LogContext {
  /** Follows one request across every service it touches. */
  correlationId: string;
  /**
   * OpenTelemetry trace id. Named `trace_id` in the output on purpose: the Loki
   * datasource in docker/observability/grafana-datasources.yml matches
   * `"trace_id":"(\w+)"` to link a log line to its trace in Tempo. Renaming this
   * field silently breaks that link.
   */
  traceId?: string;
  /**
   * Deliberately NOT the user's name, email or phone. An opaque id is enough to
   * answer "who did this" from the audit log, and anything richer is PHI in a
   * log line.
   */
  userId?: string;
  hospitalId?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

/** Runs `fn` with `context` attached to every log line it produces. */
export function runWithContext<T>(context: LogContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getContext(): LogContext | undefined {
  return storage.getStore();
}

/**
 * Adds a field to the context of the request already in flight.
 *
 * Needed because `userId` is unknown until the JWT has been verified, which
 * happens after the request context is created.
 */
export function setContext(fields: Partial<LogContext>): void {
  const current = storage.getStore();
  if (current) Object.assign(current, fields);
}
