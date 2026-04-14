import 'dotenv/config';
import nodemailer from 'nodemailer';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'notification-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

// ── SMTP Configuration ─────────────────────────────────

const awsRegion = process.env.AWS_REGION?.trim();
const smtpHost = process.env.SMTP_HOST || (awsRegion ? `email-smtp.${awsRegion}.amazonaws.com` : 'localhost');
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER?.trim() || '';
const smtpPass = process.env.SMTP_PASS?.trim() || '';
const smtpFrom = process.env.SMTP_FROM || 'noreply@hospital.ms';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth:
    smtpUser && smtpPass
      ? { user: smtpUser, pass: smtpPass }
      : undefined,
});

logger.info('SMTP configured', { host: smtpHost, port: smtpPort, from: smtpFrom });

// ── Core send ───────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<string> {
  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>/g, ''),
    });

    logger.info('Email sent', { messageId: info.messageId, to, subject });
    return info.messageId;
  } catch (error) {
    logger.error('Failed to send email', {
      to,
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ── Template: Layout wrapper ────────────────────────────

function wrapLayout(content: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      ${content}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="color:#6b7280;font-size:12px">
        This is an automated message from Hospital Management System.<br/>
        Please do not reply to this email.
      </p>
    </div>
  `;
}

// ── Template helpers ────────────────────────────────────

async function sendEmailVerification(
  to: string,
  name: string,
  verificationUrl: string,
): Promise<string> {
  const subject = 'Verify Your Email Address';
  const html = wrapLayout(`
    <h2 style="color:#2563eb">Verify Your Email</h2>
    <p>Dear ${name},</p>
    <p>Please verify your email address by clicking the button below:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${verificationUrl}"
         style="background:#2563eb;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
        Verify Email
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="${verificationUrl}" style="color:#2563eb">${verificationUrl}</a>
    </p>
    <p style="color:#6b7280;font-size:13px">This link expires in 24 hours.</p>
  `);
  return sendEmail(to, subject, html);
}

async function sendPasswordReset(
  to: string,
  name: string,
  resetUrl: string,
): Promise<string> {
  const subject = 'Reset Your Password';
  const html = wrapLayout(`
    <h2 style="color:#dc2626">Password Reset Request</h2>
    <p>Dear ${name},</p>
    <p>We received a request to reset your password. Click the button below to set a new password:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetUrl}"
         style="background:#dc2626;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
        Reset Password
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="${resetUrl}" style="color:#dc2626">${resetUrl}</a>
    </p>
    <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `);
  return sendEmail(to, subject, html);
}

async function sendAppointmentConfirmation(
  to: string,
  patientName: string,
  doctorName: string,
  dateTime: string,
  hospitalName: string,
): Promise<string> {
  const subject = 'Appointment Confirmed';
  const html = wrapLayout(`
    <h2 style="color:#2563eb">Appointment Confirmed</h2>
    <p>Dear ${patientName},</p>
    <p>Your appointment has been confirmed with the following details:</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px;font-weight:bold">Doctor</td><td style="padding:8px">${doctorName}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Date &amp; Time</td><td style="padding:8px">${dateTime}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Hospital</td><td style="padding:8px">${hospitalName}</td></tr>
    </table>
    <p>Please arrive 15 minutes before your scheduled time.</p>
    <p>Regards,<br/>${hospitalName}</p>
  `);
  return sendEmail(to, subject, html);
}

async function sendAppointmentReminder(
  to: string,
  patientName: string,
  doctorName: string,
  dateTime: string,
  hospitalName: string,
): Promise<string> {
  const subject = 'Appointment Reminder';
  const html = wrapLayout(`
    <h2 style="color:#f59e0b">Appointment Reminder</h2>
    <p>Dear ${patientName},</p>
    <p>This is a friendly reminder about your upcoming appointment:</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:8px;font-weight:bold">Doctor</td><td style="padding:8px">${doctorName}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Date &amp; Time</td><td style="padding:8px">${dateTime}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Hospital</td><td style="padding:8px">${hospitalName}</td></tr>
    </table>
    <p>Please arrive 15 minutes before your scheduled time.</p>
    <p>Regards,<br/>${hospitalName}</p>
  `);
  return sendEmail(to, subject, html);
}

async function sendPrescriptionReady(
  to: string,
  patientName: string,
  prescriptionId: string,
): Promise<string> {
  const subject = 'Your Prescription is Ready';
  const html = wrapLayout(`
    <h2 style="color:#10b981">Prescription Ready</h2>
    <p>Dear ${patientName},</p>
    <p>Your prescription <strong>${prescriptionId}</strong> is now ready for pickup at the pharmacy.</p>
    <p>Please bring a valid ID when collecting your prescription.</p>
    <p>Regards,<br/>Hospital Management System</p>
  `);
  return sendEmail(to, subject, html);
}

async function sendLabResultReady(
  to: string,
  patientName: string,
  testName: string,
): Promise<string> {
  const subject = 'Lab Results Available';
  const html = wrapLayout(`
    <h2 style="color:#8b5cf6">Lab Results Available</h2>
    <p>Dear ${patientName},</p>
    <p>The results for your <strong>${testName}</strong> test are now available.</p>
    <p>Please log in to your patient portal or visit the hospital to view your results.</p>
    <p>Regards,<br/>Hospital Management System</p>
  `);
  return sendEmail(to, subject, html);
}

async function sendWelcome(to: string, name: string): Promise<string> {
  const subject = 'Welcome to Hospital Management System';
  const html = wrapLayout(`
    <h2 style="color:#2563eb">Welcome!</h2>
    <p>Dear ${name},</p>
    <p>Welcome to the Hospital Management System. Your account has been successfully created.</p>
    <p>You can now:</p>
    <ul>
      <li>Book appointments with doctors</li>
      <li>View your medical records</li>
      <li>Access lab results online</li>
      <li>Manage prescriptions</li>
    </ul>
    <p>If you have any questions, please contact our support team.</p>
    <p>Regards,<br/>Hospital Management System</p>
  `);
  return sendEmail(to, subject, html);
}

export const emailService = {
  sendEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendPrescriptionReady,
  sendLabResultReady,
  sendWelcome,
};
