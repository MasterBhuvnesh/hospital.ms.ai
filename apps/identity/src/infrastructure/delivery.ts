import type { Logger } from '@hms/logger';
import type { Delivery } from '../modules/auth/service.js';

/**
 * Prints the OTP to the terminal instead of sending it.
 *
 * This is the only delivery driver that exists today, and it is the correct
 * default: RULES.md forbids sending a real SMS, email, push or WhatsApp message
 * from a development or test environment, and SMS additionally needs DLT
 * template registration that has weeks of lead time.
 *
 * The code goes to stdout DIRECTLY and not through the logger, which is the one
 * place in this service that does so. packages/logger redacts `otp` and `code`,
 * as it should — those lines are shipped to Loki and kept — and the way to keep
 * a developer-readable code is not to invent a field name that slips past the
 * redaction list. So the structured log records that a code was issued, with no
 * code in it, and the human-readable copy never becomes a log record at all.
 *
 * `assertDeliverable` below makes selecting this driver in production a startup
 * failure rather than a habit.
 */
export class ConsoleDelivery implements Delivery {
  readonly #log: Logger;

  constructor(log: Logger) {
    this.#log = log;
  }

  sendOtp(to: { destination: string; type: 'email' | 'phone' }, code: string): Promise<void> {
    this.#log.info({ channel: to.type }, 'OTP issued (console driver, nothing was delivered)');
    process.stdout.write(`\n  OTP for this ${to.type}: ${code}\n\n`);
    return Promise.resolve();
  }
}

/**
 * Refuses to boot a production environment on a stub driver.
 *
 * Without this, deploying to production with the default configuration produces
 * a service that accepts registrations and silently never sends a code, which
 * looks like a working system until the first patient tries to log in.
 */
export function assertDeliverable(appEnv: string, smsDriver: string, emailDriver: string): void {
  if (appEnv !== 'production') return;
  if (smsDriver === 'console' || emailDriver === 'console') {
    throw new Error(
      'APP_ENV=production with a console notification driver: OTP codes would be printed to stdout and never delivered. Set SMS_DRIVER and EMAIL_DRIVER.',
    );
  }
}
