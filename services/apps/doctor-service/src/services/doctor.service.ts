import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';

const logger = createLogger({
  serviceName: 'doctor-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

export interface CreateDoctorInput {
  userId: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  licenseNumber: string;
  phone?: string;
}

export interface UpdateDoctorInput {
  firstName?: string;
  lastName?: string;
  specialization?: string;
  licenseNumber?: string;
  phone?: string;
}

export async function getAllDoctors() {
  logger.info('Fetching all doctors');

  const doctors = await prisma.doctorProfile.findMany({
    include: { user: true },
  });

  const mappedDoctors = doctors.map((doc) => ({
    id: doc.id,
    userId: doc.userId,
    name: `Dr. ${doc.firstName} ${doc.lastName}`,
    specialty: doc.specialization || 'General Practice',
    img: (doc.firstName[0] || 'D') + (doc.lastName[0] || 'r'),
    rating: 4.8,
    exp: '5 Years',
    available: true,
    fee: 500,
  }));

  logger.info('Doctors fetched', { count: mappedDoctors.length });

  return mappedDoctors;
}

export async function getDoctorById(id: string) {
  logger.info('Fetching doctor by ID', { id });

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!doctor) {
    logger.warn('Doctor not found', { id });
    throw new Error('Doctor not found');
  }

  logger.info('Doctor fetched successfully', { id });

  return {
    id: doctor.id,
    userId: doctor.userId,
    name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
    firstName: doctor.firstName,
    lastName: doctor.lastName,
    specialty: doctor.specialization || 'General Practice',
    licenseNumber: doctor.licenseNumber,
    phone: doctor.phone,
    img: (doctor.firstName[0] || 'D') + (doctor.lastName[0] || 'r'),
    rating: 4.8,
    exp: '5 Years',
    available: true,
    fee: 500,
    email: doctor.user.email,
  };
}

export async function createDoctor(input: CreateDoctorInput) {
  const { userId, firstName, lastName, specialization, licenseNumber, phone } = input;

  logger.info('Creating doctor profile', { userId, firstName, lastName });

  const existingProfile = await prisma.doctorProfile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    logger.warn('Doctor profile already exists for user', { userId });
    throw new Error('Doctor profile already exists for this user');
  }

  const doctor = await prisma.doctorProfile.create({
    data: {
      userId,
      firstName,
      lastName,
      specialization: specialization || 'General',
      licenseNumber,
      phone: phone || null,
    },
    include: { user: true },
  });

  logger.info('Doctor profile created', { id: doctor.id, userId });

  return {
    id: doctor.id,
    userId: doctor.userId,
    name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
    firstName: doctor.firstName,
    lastName: doctor.lastName,
    specialty: doctor.specialization || 'General Practice',
    licenseNumber: doctor.licenseNumber,
    phone: doctor.phone,
    email: doctor.user.email,
  };
}

export async function updateDoctor(id: string, input: UpdateDoctorInput) {
  logger.info('Updating doctor profile', { id });

  const existing = await prisma.doctorProfile.findUnique({ where: { id } });

  if (!existing) {
    logger.warn('Doctor not found for update', { id });
    throw new Error('Doctor not found');
  }

  const doctor = await prisma.doctorProfile.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.specialization !== undefined && { specialization: input.specialization }),
      ...(input.licenseNumber !== undefined && { licenseNumber: input.licenseNumber }),
      ...(input.phone !== undefined && { phone: input.phone }),
    },
    include: { user: true },
  });

  logger.info('Doctor profile updated', { id });

  return {
    id: doctor.id,
    userId: doctor.userId,
    name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
    firstName: doctor.firstName,
    lastName: doctor.lastName,
    specialty: doctor.specialization || 'General Practice',
    licenseNumber: doctor.licenseNumber,
    phone: doctor.phone,
    email: doctor.user.email,
  };
}

export async function deleteDoctor(id: string) {
  logger.info('Deleting doctor profile', { id });

  const existing = await prisma.doctorProfile.findUnique({ where: { id } });

  if (!existing) {
    logger.warn('Doctor not found for deletion', { id });
    throw new Error('Doctor not found');
  }

  await prisma.doctorProfile.delete({ where: { id } });

  logger.info('Doctor profile deleted', { id });

  return { message: 'Doctor profile deleted successfully' };
}
