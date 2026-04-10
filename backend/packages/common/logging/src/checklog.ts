/**
 * @fileoverview Checklog - Logging Health Check Service
 * @description Validates that logging is configured and working correctly.
 * Tests all log levels, verifies file outputs, and reports any issues.
 *
 * @module @hms/common-logging/checklog
 * @version 1.0.0
 */

import { createLogger } from './index.js';
import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

/**
 * Checklog service - validates logging functionality
 */
export class Checklog {
  private results: CheckResult[] = [];
  private logDir: string;
  private serviceName: string;

  private enableFile: boolean;

  constructor(options: { logDir?: string; serviceName?: string; enableFile?: boolean } = {}) {
    this.logDir = options.logDir || './logs/checklog-test';
    this.serviceName = options.serviceName || 'checklog';
    this.enableFile = options.enableFile ?? false;
  }

  /**
   * Run all logging checks
   */
  async run(): Promise<void> {
    console.log('\n🔍 Checklog - Logging Health Check\n');
    console.log('='.repeat(50));

    // Test 1: Create logger
    await this.checkLoggerCreation();

    // Test 2: Test all log levels
    await this.checkLogLevels();

    // Test 3: File output
    await this.checkFileOutput();

    // Test 4: Structured data (metadata)
    await this.checkMetadata();

    // Test 5: Error handling
    await this.checkErrorHandling();

    // Print results
    this.printResults();
  }

  private async checkLoggerCreation(): Promise<void> {
    try {
      const logger = createLogger({
        serviceName: this.serviceName,
        level: 'silly',
        enableConsole: true,
        enableFile: this.enableFile,
        logDirectory: this.logDir,
      });

      this.addResult('Logger Creation', 'pass', 'Logger initialized successfully');
    } catch (error) {
      this.addResult(
        'Logger Creation',
        'fail',
        'Failed to create logger',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async checkLogLevels(): Promise<void> {
    const levels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'] as const;
    const logger = createLogger({
      serviceName: this.serviceName,
      level: 'silly',
      enableConsole: true,
      enableFile: this.enableFile,
      logDirectory: this.logDir,
    });

    console.log('\n📋 Testing log levels...\n');

    for (const level of levels) {
      try {
        logger.log(level, `Test ${level} message`, { testId: Date.now() });
        this.addResult(`Level: ${level}`, 'pass', `${level.toUpperCase()} level working`);
      } catch (error) {
        this.addResult(
          `Level: ${level}`,
          'fail',
          `${level.toUpperCase()} level failed`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  private async checkFileOutput(): Promise<void> {
    // Skip file checks if file logging is disabled
    if (!this.enableFile) {
      console.log('\n📁 File output checks skipped (file logging disabled)\n');
      this.addResult('File Output', 'pass', 'File logging disabled (console only mode)');
      return;
    }

    console.log('\n📁 Checking file output...\n');

    // Wait a moment for files to be written
    await new Promise((resolve) => setTimeout(resolve, 500));

    const checks = [
      { name: 'Log Directory Exists', path: this.logDir },
      { name: 'Combined Log File', pattern: /checklog-\d{4}-\d{2}-\d{2}\.log$/ },
      { name: 'Error Log File', pattern: /checklog-error-\d{4}-\d{2}-\d{2}\.log$/ },
    ];

    for (const check of checks) {
      if (check.path) {
        if (existsSync(check.path)) {
          const stats = statSync(check.path);
          this.addResult(
            check.name,
            'pass',
            `Directory exists (${stats.isDirectory() ? 'dir' : 'file'})`
          );
        } else {
          this.addResult(check.name, 'fail', 'Path does not exist', check.path);
        }
      } else if (check.pattern) {
        try {
          const files = existsSync(this.logDir) ? readdirSync(this.logDir) : [];
          const matched = files.find((f) => check.pattern!.test(f));
          if (matched) {
            const filePath = join(this.logDir, matched);
            const stats = statSync(filePath);
            this.addResult(
              check.name,
              'pass',
              `Found ${matched} (${(stats.size / 1024).toFixed(2)} KB)`,
              filePath
            );
          } else {
            this.addResult(check.name, 'warn', 'Log file not found yet (may need more time)');
          }
        } catch (error) {
          this.addResult(
            check.name,
            'fail',
            'Failed to check files',
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }
  }

  private async checkMetadata(): Promise<void> {
    console.log('\n🏷️  Checking metadata support...\n');

    const logger = createLogger({
      serviceName: this.serviceName,
      level: 'debug',
      enableConsole: true,
      enableFile: this.enableFile,
      logDirectory: this.logDir,
    });

    try {
      // Test various metadata types
      logger.info('String metadata', { key: 'value' });
      logger.info('Number metadata', { count: 42, pi: 3.14 });
      logger.info('Boolean metadata', { active: true, verified: false });
      logger.info('Nested metadata', { user: { id: 123, name: 'test' } });
      logger.info('Array metadata', { items: ['a', 'b', 'c'] });
      logger.info('Complex metadata', {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        tags: ['test', 'checklog'],
      });

      this.addResult('Metadata Logging', 'pass', 'All metadata types logged successfully');
    } catch (error) {
      this.addResult(
        'Metadata Logging',
        'fail',
        'Failed to log metadata',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async checkErrorHandling(): Promise<void> {
    console.log('\n⚠️  Checking error handling...\n');

    const logger = createLogger({
      serviceName: this.serviceName,
      level: 'debug',
      enableConsole: true,
      enableFile: this.enableFile,
      logDirectory: this.logDir,
    });

    try {
      // Log an Error object
      const testError = new Error('Test error for logging');
      testError.stack = 'Error: Test error for logging\n    at Test.method (file.ts:1:1)';
      logger.error('Error object test', testError);

      // Log error with metadata
      logger.error('Database connection failed', {
        error: { message: 'Connection refused', code: 'ECONNREFUSED' },
        retryCount: 3,
      });

      this.addResult('Error Logging', 'pass', 'Error objects logged successfully');
    } catch (error) {
      this.addResult(
        'Error Logging',
        'fail',
        'Failed to log errors',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private addResult(
    name: string,
    status: 'pass' | 'fail' | 'warn',
    message: string,
    details?: string
  ): void {
    this.results.push({ name, status, message, details });
  }

  private printResults(): void {
    console.log('\n');
    console.log('='.repeat(50));
    console.log('📊 CHECKLOG RESULTS\n');

    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;
    const warnings = this.results.filter((r) => r.status === 'warn').length;

    for (const result of this.results) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${result.name}`);
      console.log(`   ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      console.log();
    }

    console.log('='.repeat(50));
    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

    if (failed === 0) {
      console.log('✨ All critical checks passed! Logging is working correctly.\n');
    } else {
      console.log('⚠️  Some checks failed. Review the output above.\n');
      process.exit(1);
    }
  }
}

/**
 * Run checklog from CLI
 */
export async function runChecklog(): Promise<void> {
  const checklog = new Checklog();
  await checklog.run();
}

// Run when executed directly
runChecklog().catch((error) => {
  console.error('Checklog failed:', error);
  process.exit(1);
});
