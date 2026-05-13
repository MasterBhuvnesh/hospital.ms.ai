import winston from 'winston';

export interface LoggerOptions {
  serviceName: string;
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  logDir?: string;
}

export function createLogger(options: LoggerOptions): winston.Logger {
  const {
    serviceName,
    level = 'info',
    enableConsole = true,
    enableFile = false,
    logDir = 'logs',
  } = options;

  const transports: winston.transport[] = [];

  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `[${timestamp}] [${serviceName}] ${level}: ${message}${metaStr}`;
          })
        ),
      })
    );
  }

  if (enableFile) {
    transports.push(
      new winston.transports.File({
        filename: `${logDir}/${serviceName}-error.log`,
        level: 'error',
      }),
      new winston.transports.File({
        filename: `${logDir}/${serviceName}-combined.log`,
      })
    );
  }

  return winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports,
  });
}
