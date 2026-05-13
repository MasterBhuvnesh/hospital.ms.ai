import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'appointment-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://localhost:3008';

export async function triggerAppointmentBillPdf(appointmentId: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      logger.error('Appointment not found for PDF generation', { appointmentId });
      return;
    }

    const billPayload = {
      billNumber: `APT-${appointment.id.slice(0, 8).toUpperCase()}`,
      date: new Date().toISOString().split('T')[0],
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      patientPhone: appointment.patient.phone || '',
      doctorName: `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
      specialization: appointment.doctor.specialization,
      appointmentDate: appointment.date,
      appointmentTime: appointment.time,
      appointmentType: appointment.type,
      consultationFee: appointment.fee || 0,
      grandTotal: appointment.fee || 0,
      paymentMethod: 'Cash',
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
    };

    logger.info('Triggering appointment bill PDF generation', { appointmentId });

    const response = await fetch(`${PDF_SERVICE_URL}/pdf/appointment-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('PDF generation failed', { status: response.status, error });
      return;
    }

    const result = (await response.json()) as { url: string };

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { pdfUrl: result.url },
    });

    logger.info('Appointment bill PDF generated and saved', { appointmentId, url: result.url });
    return result.url;
  } catch (error) {
    logger.error('Error triggering appointment bill PDF', { appointmentId, error });
  }
}
