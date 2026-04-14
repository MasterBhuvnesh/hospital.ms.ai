import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'identity-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5015';

async function callNotification(path: string, body: Record<string, string>): Promise<void> {
  try {
    const res = await fetch(`${NOTIFICATION_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error('Notification service returned error', { path, status: res.status, body: text });
    } else {
      logger.info('Notification sent', { path, to: body.to });
    }
  } catch (error) {
    // Fire-and-forget — log but don't throw so the caller isn't blocked
    logger.error('Failed to reach notification service', {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function sendVerificationEmail(to: string, name: string, callbackUrl: string, token: string): Promise<void> {
  const verificationUrl = `${callbackUrl}?token=${token}`;
  await callNotification('/notifications/email-verification', { to, name, verificationUrl });
}

export async function sendPasswordResetEmail(to: string, name: string, callbackUrl: string, token: string): Promise<void> {
  const resetUrl = `${callbackUrl}?token=${token}`;
  await callNotification('/notifications/password-reset', { to, name, resetUrl });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await callNotification('/notifications/welcome', { to, name });
}
