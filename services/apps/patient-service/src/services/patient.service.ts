import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'patient-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

export interface CreatePatientInput {
  userId?: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone?: string;
  vitals?: string;
}

export interface UpdatePatientInput {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  vitals?: string;
}

export async function getAllPatients() {
  logger.info('Fetching all patients');

  const patients = await prisma.patientProfile.findMany({
    include: {
      user: true,
      appointments: true,
      prescriptions: true,
      medicalReports: true,
    },
  });

  logger.info('Patients fetched', { count: patients.length });

  return patients;
}

export async function getPatientById(id: string) {
  logger.info('Fetching patient by ID', { id });

  const patient = await prisma.patientProfile.findUnique({
    where: { id },
    include: {
      user: true,
      appointments: true,
      prescriptions: true,
      medicalReports: true,
    },
  });

  if (!patient) {
    logger.warn('Patient not found', { id });
    throw new Error('Patient not found');
  }

  logger.info('Patient fetched successfully', { id });

  return patient;
}

export async function createPatient(input: CreatePatientInput) {
  const { firstName, lastName, dob, gender, phone, vitals } = input;
  let userId = input.userId;

  logger.info('Creating patient profile', { userId, firstName, lastName });

  // Walk-in support: if no userId, create a dummy user
  if (!userId) {
    logger.info('No userId provided, creating walk-in user');
    const user = await prisma.user.create({
      data: {
        email: `${Date.now()}@walkin.local`,
        password: 'dummy',
        role: 'PATIENT',
      },
    });
    userId = user.id;
    logger.info('Walk-in user created', { userId, email: user.email });
  }

  const patient = await prisma.patientProfile.create({
    data: {
      userId,
      firstName,
      lastName,
      dob: new Date(dob),
      gender,
      phone: phone || null,
      vitals: vitals || undefined,
    },
    include: {
      user: true,
      appointments: true,
      prescriptions: true,
      medicalReports: true,
    },
  });

  logger.info('Patient profile created', { id: patient.id, userId });

  return patient;
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  logger.info('Updating patient profile', { id });

  const existing = await prisma.patientProfile.findUnique({ where: { id } });

  if (!existing) {
    logger.warn('Patient not found for update', { id });
    throw new Error('Patient not found');
  }

  const patient = await prisma.patientProfile.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.dob !== undefined && { dob: new Date(input.dob) }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.vitals !== undefined && { vitals: input.vitals }),
    },
    include: {
      user: true,
      appointments: true,
      prescriptions: true,
      medicalReports: true,
    },
  });

  logger.info('Patient profile updated', { id });

  return patient;
}

export async function deletePatient(id: string) {
  logger.info('Deleting patient profile', { id });

  const existing = await prisma.patientProfile.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!existing) {
    logger.warn('Patient not found for deletion', { id });
    throw new Error('Patient not found');
  }

  // Cascade delete: appointments, prescriptions, then profile
  await prisma.appointment.deleteMany({ where: { patientId: id } });
  await prisma.prescription.deleteMany({ where: { patientId: id } });
  await prisma.patientProfile.delete({ where: { id } });

  logger.info('Patient profile and related records deleted', { id });

  // If walk-in user, delete the dummy user too
  if (existing.user.email.endsWith('@walkin.local')) {
    await prisma.user.delete({ where: { id: existing.userId } });
    logger.info('Walk-in dummy user deleted', { userId: existing.userId });
  }

  return { message: 'Patient profile deleted successfully' };
}
