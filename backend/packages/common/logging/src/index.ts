/**
 * @fileoverview HMS Common Logger
 * @description Winston-based logging configuration for all HMS microservices.
 * Provides structured logging with console and file outputs, log rotation,
 * and proper formatting for development and production environments.
 *
 * @module @hms/common-logging
 * @version 1.0.0
 * @author Hospital Management System
 */

import winston, { Logger, Logform, format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

/**
 * Log levels with their severity values
 * Lower value = higher severity
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Colors associated with each log level
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
} as const;

/**
 * Configuration options for the logger
 */
export interface LoggerConfig {
  /** Service name identifier */
  serviceName: string;
  /** Minimum log level to capture */
  level?: LogLevel;
  /** Enable console logging */
  enableConsole?: boolean;
  /** Enable file logging */
  enableFile?: boolean;
  /** Directory for log files */
  logDirectory?: string;
  /** Node environment */
  environment?: 'development' | 'production' | 'test';
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<LoggerConfig, 'serviceName'>> = {
  level: 'info',
  enableConsole: true,
  enableFile: true,
  logDirectory: './logs',
  environment: 'development',
};

/**
 * Add colors to winston
 */
winston.addColors(LOG_COLORS);

/**
 * Format for console output (development-friendly)
 */
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.colorize({ all: true }),
  format.printf(({ level, message, timestamp, service, ...metadata }) => {
    let msg = `${timestamp} [${service}] ${level}: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

/**
 * Format for file output (structured JSON)
 */
const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

/**
 * Creates a logger instance for a specific service
 *
 * @param config - Logger configuration
 * @returns Configured Winston logger instance
 *
 * @example
 * ```typescript
 * import { createLogger } from '@hms/common-logging';
 *
 * const logger = createLogger({
 *   serviceName: 'identity-service',
 *   level: 'debug',
 *   enableFile: true,
 * });
 *
 * logger.info('Server started', { port: 5001 });
 * logger.error('Database connection failed', { error: err.message });
 * ```
 */
export function createLogger(config: LoggerConfig): Logger {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const transports: winston.transport[] = [];

  // Create log directory if file logging is enabled
  if (mergedConfig.enableFile) {
    if (!existsSync(mergedConfig.logDirectory)) {
      mkdirSync(mergedConfig.logDirectory, { recursive: true });
    }

    const logPath = join(mergedConfig.logDirectory, mergedConfig.serviceName);

    // Rotating combined log
    transports.push(
      new DailyRotateFile({
        filename: `${logPath}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: mergedConfig.level,
        format: fileFormat,
      })
    );

    // Rotating error log
    transports.push(
      new DailyRotateFile({
        filename: `${logPath}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: fileFormat,
      })
    );
  }

  // Console transport
  if (mergedConfig.enableConsole) {
    transports.push(
      new winston.transports.Console({
        level: mergedConfig.level,
        format: consoleFormat,
      })
    );
  }

  return winston.createLogger({
    level: mergedConfig.level,
    levels: LOG_LEVELS,
    defaultMeta: {
      service: mergedConfig.serviceName,
      environment: mergedConfig.environment,
    },
    transports,
    // Handle uncaught exceptions and rejections
    exceptionHandlers: mergedConfig.enableFile
      ? [
          new DailyRotateFile({
            filename: join(
              mergedConfig.logDirectory,
              `${mergedConfig.serviceName}-exceptions-%DATE%.log`
            ),
            datePattern: 'YYYY-MM-DD',
            format: fileFormat,
          }),
        ]
      : undefined,
    rejectionHandlers: mergedConfig.enableFile
      ? [
          new DailyRotateFile({
            filename: join(
              mergedConfig.logDirectory,
              `${mergedConfig.serviceName}-rejections-%DATE%.log`
            ),
            datePattern: 'YYYY-MM-DD',
            format: fileFormat,
          }),
        ]
      : undefined,
  });
}

/**
 * Gets the log level from environment variable
 * Falls back to provided default or 'info'
 */
export function getLogLevel(defaultLevel: LogLevel = 'info'): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel;
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }
  return defaultLevel;
}

/**
 * Re-export winston types for convenience
 */
export { Logger } from 'winston';

/**
 * Default export for common use cases
 */
export default createLogger;
