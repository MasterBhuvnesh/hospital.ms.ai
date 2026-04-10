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

const smtpHost = process.env.SMTP_HOST || 'localhost';
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
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

// ── Template helpers ────────────────────────────────────

async function sendAppointmentConfirmation(
  to: string,
  patientName: string,
  doctorName: string,
  dateTime: string,
  hospitalName: string,
): Promise<string> {
  const subject = 'Appointment Confirmed';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
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
    </div>
  `;
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
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
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
    </div>
  `;
  return sendEmail(to, subject, html);
}

async function sendPrescriptionReady(
  to: string,
  patientName: string,
  prescriptionId: string,
): Promise<string> {
  const subject = 'Your Prescription is Ready';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#10b981">Prescription Ready</h2>
      <p>Dear ${patientName},</p>
      <p>Your prescription <strong>${prescriptionId}</strong> is now ready for pickup at the pharmacy.</p>
      <p>Please bring a valid ID when collecting your prescription.</p>
      <p>Regards,<br/>Hospital Management System</p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

async function sendLabResultReady(
  to: string,
  patientName: string,
  testName: string,
): Promise<string> {
  const subject = 'Lab Results Available';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#8b5cf6">Lab Results Available</h2>
      <p>Dear ${patientName},</p>
      <p>The results for your <strong>${testName}</strong> test are now available.</p>
      <p>Please log in to your patient portal or visit the hospital to view your results.</p>
      <p>Regards,<br/>Hospital Management System</p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

async function sendWelcome(to: string, name: string): Promise<string> {
  const subject = 'Welcome to Hospital Management System';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
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
    </div>
  `;
  return sendEmail(to, subject, html);
}

export const emailService = {
  sendEmail,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendPrescriptionReady,
  sendLabResultReady,
  sendWelcome,
};
