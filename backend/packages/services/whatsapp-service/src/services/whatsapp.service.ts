import crypto from 'crypto';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'whatsapp-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

// ── Types ───────────────────────────────────────────

interface SendResult {
  success: true;
  messageId: string;
  channel: 'whatsapp-stub';
}

// ── Helpers ─────────────────────────────────────────

function buildResult(): SendResult {
  return {
    success: true,
    messageId: crypto.randomUUID(),
    channel: 'whatsapp-stub',
  };
}

// ── Service ─────────────────────────────────────────

export const whatsappService = {
  /**
   * Send a generic text message via WhatsApp (stub).
   */
  sendMessage(phone: string, message: string): SendResult {
    const result = buildResult();

    console.log(`\n========== WHATSAPP MESSAGE ==========`);
    console.log(`To:      ${phone}`);
    console.log(`Message: ${message}`);
    console.log(`ID:      ${result.messageId}`);
    console.log(`=======================================\n`);

    logger.info('WhatsApp message sent (stub)', {
      phone,
      messageId: result.messageId,
      type: 'generic',
    });

    return result;
  },

  /**
   * Send an appointment confirmation message.
   */
  sendAppointmentConfirmation(
    phone: string,
    patientName: string,
    doctorName: string,
    dateTime: string,
    hospitalName: string,
  ): SendResult {
    const result = buildResult();

    const message =
      `Dear ${patientName}, your appointment has been confirmed.\n` +
      `Doctor: ${doctorName}\n` +
      `Date & Time: ${dateTime}\n` +
      `Hospital: ${hospitalName}\n` +
      `Please arrive 15 minutes early.`;

    console.log(`\n==== WHATSAPP APPOINTMENT CONFIRMATION ====`);
    console.log(`To:       ${phone}`);
    console.log(`Patient:  ${patientName}`);
    console.log(`Doctor:   ${doctorName}`);
    console.log(`DateTime: ${dateTime}`);
    console.log(`Hospital: ${hospitalName}`);
    console.log(`Message:\n${message}`);
    console.log(`ID:       ${result.messageId}`);
    console.log(`============================================\n`);

    logger.info('WhatsApp appointment confirmation sent (stub)', {
      phone,
      patientName,
      doctorName,
      dateTime,
      hospitalName,
      messageId: result.messageId,
      type: 'appointment-confirmation',
    });

    return result;
  },

  /**
   * Send an appointment reminder message.
   */
  sendAppointmentReminder(
    phone: string,
    patientName: string,
    doctorName: string,
    dateTime: string,
    hospitalName: string,
  ): SendResult {
    const result = buildResult();

    const message =
      `Reminder: Hi ${patientName}, you have an upcoming appointment.\n` +
      `Doctor: ${doctorName}\n` +
      `Date & Time: ${dateTime}\n` +
      `Hospital: ${hospitalName}\n` +
      `Don't forget to bring your documents.`;

    console.log(`\n====== WHATSAPP APPOINTMENT REMINDER ======`);
    console.log(`To:       ${phone}`);
    console.log(`Patient:  ${patientName}`);
    console.log(`Doctor:   ${doctorName}`);
    console.log(`DateTime: ${dateTime}`);
    console.log(`Hospital: ${hospitalName}`);
    console.log(`Message:\n${message}`);
    console.log(`ID:       ${result.messageId}`);
    console.log(`============================================\n`);

    logger.info('WhatsApp appointment reminder sent (stub)', {
      phone,
      patientName,
      doctorName,
      dateTime,
      hospitalName,
      messageId: result.messageId,
      type: 'appointment-reminder',
    });

    return result;
  },

  /**
   * Send a queue position update message.
   */
  sendQueueUpdate(
    phone: string,
    patientName: string,
    tokenNumber: string,
    position: number,
    doctorName: string,
  ): SendResult {
    const result = buildResult();

    const message =
      `Hi ${patientName}, your queue update:\n` +
      `Token: ${tokenNumber}\n` +
      `Current Position: ${position}\n` +
      `Doctor: ${doctorName}\n` +
      `Please be ready when your number is called.`;

    console.log(`\n========= WHATSAPP QUEUE UPDATE ===========`);
    console.log(`To:       ${phone}`);
    console.log(`Patient:  ${patientName}`);
    console.log(`Token:    ${tokenNumber}`);
    console.log(`Position: ${position}`);
    console.log(`Doctor:   ${doctorName}`);
    console.log(`Message:\n${message}`);
    console.log(`ID:       ${result.messageId}`);
    console.log(`============================================\n`);

    logger.info('WhatsApp queue update sent (stub)', {
      phone,
      patientName,
      tokenNumber,
      position,
      doctorName,
      messageId: result.messageId,
      type: 'queue-update',
    });

    return result;
  },

  /**
   * Send a prescription ready notification.
   */
  sendPrescriptionReady(
    phone: string,
    patientName: string,
    prescriptionId: string,
  ): SendResult {
    const result = buildResult();

    const message =
      `Hi ${patientName}, your prescription (${prescriptionId}) is ready.\n` +
      `Please visit the pharmacy counter to collect your medicines.`;

    console.log(`\n======= WHATSAPP PRESCRIPTION READY =======`);
    console.log(`To:             ${phone}`);
    console.log(`Patient:        ${patientName}`);
    console.log(`PrescriptionId: ${prescriptionId}`);
    console.log(`Message:\n${message}`);
    console.log(`ID:             ${result.messageId}`);
    console.log(`============================================\n`);

    logger.info('WhatsApp prescription ready sent (stub)', {
      phone,
      patientName,
      prescriptionId,
      messageId: result.messageId,
      type: 'prescription-ready',
    });

    return result;
  },

  /**
   * Send a lab result ready notification.
   */
  sendLabResultReady(
    phone: string,
    patientName: string,
    testName: string,
  ): SendResult {
    const result = buildResult();

    const message =
      `Hi ${patientName}, your lab result for "${testName}" is ready.\n` +
      `Please check your patient portal or visit the hospital to collect the report.`;

    console.log(`\n======== WHATSAPP LAB RESULT READY ========`);
    console.log(`To:       ${phone}`);
    console.log(`Patient:  ${patientName}`);
    console.log(`Test:     ${testName}`);
    console.log(`Message:\n${message}`);
    console.log(`ID:       ${result.messageId}`);
    console.log(`============================================\n`);

    logger.info('WhatsApp lab result ready sent (stub)', {
      phone,
      patientName,
      testName,
      messageId: result.messageId,
      type: 'lab-result-ready',
    });

    return result;
  },
};
