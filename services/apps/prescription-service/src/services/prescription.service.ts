import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';
import { triggerPrescriptionPdf } from './pdf-trigger.service';

const logger = createLogger({
  serviceName: 'prescription-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

export interface CreatePrescriptionDto {
  patientId: string;
  doctorId: string;
  medicineId?: string;
  medicineName?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  diagnosis?: string;
  doctorNotes?: string;
  quantity?: number;
  status?: string;
}

export interface UpdatePrescriptionDto {
  patientId?: string;
  doctorId?: string;
  medicineId?: string;
  quantity?: number;
  status?: string;
}

export const prescriptionService = {
  async findAll(filters: { patientId?: string; doctorId?: string }) {
    const where: Record<string, string> = {};

    if (filters.patientId) {
      // Resolve: frontend may send User.id instead of PatientProfile.id
      const profile = await prisma.patientProfile.findUnique({ where: { userId: filters.patientId } });
      where.patientId = profile ? profile.id : filters.patientId;
    }
    if (filters.doctorId) {
      const profile = await prisma.doctorProfile.findUnique({ where: { userId: filters.doctorId } });
      where.doctorId = profile ? profile.id : filters.doctorId;
    }

    logger.info('Fetching prescriptions', { filters, resolvedWhere: where });

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        patient: true,
        doctor: { include: { user: true } },
        medicine: true,
      },
      orderBy: { issuedAt: 'desc' },
    });

    logger.info(`Found ${prescriptions.length} prescriptions`);
    return prescriptions;
  },

  async findById(id: string) {
    logger.info('Fetching prescription by ID', { id });

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        medicine: true,
      },
    });

    return prescription;
  },

  async create(data: CreatePrescriptionDto) {
    logger.info('Creating prescription', { data });

    // Resolve patientId: may be User.id instead of PatientProfile.id
    let resolvedPatientId = data.patientId;
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: data.patientId } });
    if (patientProfile) resolvedPatientId = patientProfile.id;

    // Resolve doctorId: may be User.id instead of DoctorProfile.id
    let resolvedDoctorId = data.doctorId;
    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: data.doctorId } });
    if (doctorProfile) resolvedDoctorId = doctorProfile.id;

    // Resolve or create medicine
    let medicineId = data.medicineId;
    if (!medicineId || medicineId === 'dummy-med-id') {
      const name = data.medicineName || 'General Medication';
      const description = [data.dose, data.frequency, data.duration].filter(Boolean).join(' · ') || 'As prescribed';
      let medicine = await prisma.medicine.findFirst({ where: { name } });
      if (!medicine) {
        medicine = await prisma.medicine.create({
          data: { name, description, price: 0, stock: 100 },
        });
      }
      medicineId = medicine.id;
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId: resolvedPatientId,
        doctorId: resolvedDoctorId,
        medicineId,
        quantity: data.quantity || 1,
        status: data.status || 'PENDING',
      },
    });

    logger.info('Prescription created', { id: prescription.id });

    triggerPrescriptionPdf(prescription.id).catch((err) => {
      logger.error('Background PDF generation failed', { id: prescription.id, error: err });
    });

    return prescription;
  },

  async update(id: string, data: UpdatePrescriptionDto) {
    logger.info('Updating prescription', { id, data });

    const prescription = await prisma.prescription.update({
      where: { id },
      data,
    });

    logger.info('Prescription updated', { id: prescription.id });
    return prescription;
  },

  async delete(id: string) {
    logger.info('Deleting prescription', { id });

    const prescription = await prisma.prescription.delete({
      where: { id },
    });

    logger.info('Prescription deleted', { id });
    return prescription;
  },
};
