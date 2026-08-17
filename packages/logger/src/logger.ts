import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';
import { getContext } from './context.js';
import { REDACT_CENSOR, REDACT_PATHS } from './redact.js';

export type { Logger } from 'pino';

export interface LoggerConfig {
  /** The service name, which every line is tagged with. */
  service: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
  /**
   * Human-readable output through pino-pretty. Development only: it costs a
   * synchronous transport and destroys the structured output Loki parses.
   */
  pretty?: boolean;
  /**
   * Where lines are written. Defaults to stdout, which is what a container
   * expects. Exists so the redaction tests can assert on real output: a
   * redaction rule nobody can observe is a redaction rule nobody can trust.
   */
  destination?: DestinationStream;
}

/**
 * Builds a logger for one service.
 *
 * A factory rather than a shared singleton, because several services run in one
 * process in the single-host deployment (see docker/all-in-one.mjs) and a line
 * tagged with the wrong service name is worse than no tag at all.
 */
export function createLogger(config: LoggerConfig): Logger {
  const options: LoggerOptions = {
    level: config.level ?? 'info',
    base: { service: config.service },

    // Redaction is configured here, once, and cannot be turned off by a caller.
    // A logger that can be constructed without it is a logger somebody will
    // construct without it.
    redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR },

    // Merged into every line, so correlation never depends on the call site
    // remembering to pass it.
    mixin() {
      const context = getContext();
      if (!context) return {};
      return {
        correlationId: context.correlationId,
        ...(context.traceId ? { trace_id: context.traceId } : {}),
        ...(context.userId ? { userId: context.userId } : {}),
        ...(context.hospitalId ? { hospitalId: context.hospitalId } : {}),
      };
    },

    // ISO timestamps rather than epoch milliseconds: these are read by humans
    // during incidents at least as often as by machines.
    timestamp: pino.stdTimeFunctions.isoTime,

    formatters: {
      // `level: "info"` rather than `level: 30`. Loki queries are written by
      // people.
      level: (label) => ({ level: label }),
    },
  };

  if (config.pretty) {
    // A transport and an explicit destination are mutually exclusive in pino, so
    // pretty output ignores `destination` by design.
    return pino({
      ...options,
      transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
    });
  }

  return config.destination ? pino(options, config.destination) : pino(options);
}
