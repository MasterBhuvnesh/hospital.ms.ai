# @hms/common-logging

Common Winston logging configuration for all Hospital Management System microservices.

## Installation

```bash
pnpm add @hms/common-logging
```

## Usage

```typescript
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'identity-service',
  level: 'info',
  enableConsole: true,
  enableFile: true,
  logDirectory: './logs',
  environment: 'development',
});

// Log messages
logger.info('Server started', { port: 5001 });
logger.warn('Rate limit approaching', { requests: 90 });
logger.error('Database connection failed', { error: err.message });
```

## Features

- Structured JSON logging to files
- Colorized console output for development
- Automatic log rotation (daily)
- Separate error log files
- Exception and rejection handling
- Service metadata tagging

## Configuration

| Option          | Type    | Default       | Description           |
| --------------- | ------- | ------------- | --------------------- |
| `serviceName`   | string  | required      | Service identifier    |
| `level`         | string  | 'info'        | Minimum log level     |
| `enableConsole` | boolean | true          | Enable console output |
| `enableFile`    | boolean | true          | Enable file output    |
| `logDirectory`  | string  | './logs'      | Log file directory    |
| `environment`   | string  | 'development' | Environment name      |

## Log Levels

- `error`: Critical errors
- `warn`: Warning conditions
- `info`: Informational messages
- `http`: HTTP requests
- `verbose`: Verbose debugging
- `debug`: Debug messages
- `silly`: All messages

## Checklog - Logging Health Check

Run the checklog service to verify your logging setup is working correctly:

```bash
# Using pnpm script
pnpm checklog

# Or via CLI after building
pnpm build
npx checklog
```

This will test:

- ✅ Logger creation
- ✅ All log levels (error → silly)
- ✅ Console output
- ✅ File output with rotation
- ✅ Metadata/structured logging
- ✅ Error object handling

You can also use it programmatically:

```typescript
import { Checklog } from '@hms/common-logging/checklog';

const checklog = new Checklog({
  logDir: './logs/test',
  serviceName: 'my-service-test',
});

await checklog.run();
```
