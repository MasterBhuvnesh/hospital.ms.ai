import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'prescription-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://localhost:3008';

export async function triggerPrescriptionPdf(prescriptionId: string) {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        medicine: true,
      },
    });

    if (!prescription) {
      logger.error('Prescription not found for PDF generation', { prescriptionId });
      return;
    }

    const pdfPayload = {
      prescriptionId: `RX-${prescription.id.slice(0, 8).toUpperCase()}`,
      date: new Date().toISOString().split('T')[0],
      patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
      patientGender: prescription.patient.gender,
      doctorName: `${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
      doctorSpecialization: prescription.doctor.specialization,
      doctorLicense: prescription.doctor.licenseNumber,
      medicines: [
        {
          name: prescription.medicine.name,
          dose: prescription.medicine.description.split(' · ')[0] || 'As prescribed',
          frequency: prescription.medicine.description.split(' · ')[1] || 'As directed',
          duration: prescription.medicine.description.split(' · ')[2] || 'As needed',
          quantity: prescription.quantity,
        },
      ],
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
    };

    logger.info('Triggering prescription PDF generation', { prescriptionId });

    const response = await fetch(`${PDF_SERVICE_URL}/pdf/prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdfPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('PDF generation failed', { status: response.status, error });
      return;
    }

    const result = (await response.json()) as { url: string };

    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { pdfUrl: result.url },
    });

    logger.info('Prescription PDF generated and saved', { prescriptionId, url: result.url });
    return result.url;
  } catch (error) {
    logger.error('Error triggering prescription PDF', { prescriptionId, error });
  }
}
