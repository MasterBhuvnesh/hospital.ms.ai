import { prisma } from '@hms/common-db';
import { createLogger } from '@hms/common-logging';
import { triggerAppointmentBillPdf } from './pdf-trigger.service';

const logger = createLogger({
  serviceName: 'appointment-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  date: string;
  time?: string;
  slot?: string;
  type?: string;
  notes?: string;
  fee?: number;
  status?: string;
}

export interface UpdateAppointmentInput {
  status: string;
}

export const getAppointments = async (patientUserId?: string, doctorId?: string) => {
  let where: Record<string, unknown> = {};

  if (patientUserId) {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: patientUserId } });
    if (profile) {
      where = { patientId: profile.id };
    } else {
      where = { patientId: patientUserId };
    }
  }

  if (doctorId) {
    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
    where = { ...where, doctorId: doctorProfile ? doctorProfile.id : doctorId };
  }

  logger.info('Fetching appointments', { where });

  const appointments = await prisma.appointment.findMany({
    where,
    include: { patient: true, doctor: { include: { user: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return appointments;
};

export const getAppointmentById = async (id: string) => {
  logger.info('Fetching appointment by ID', { id });

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: true, doctor: { include: { user: true } } },
  });

  return appointment;
};

export const createAppointment = async (data: CreateAppointmentInput) => {
  const { patientId, doctorId, date, time, slot, type, notes, fee, status } = data;

  logger.info('Creating appointment', { patientId, doctorId, date });

  // Resolve patientId: frontend may send User.id instead of PatientProfile.id
  let resolvedPatientId = patientId;
  const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: patientId } });
  if (patientProfile) {
    resolvedPatientId = patientProfile.id;
  }

  // Resolve doctorId: frontend may send User.id instead of DoctorProfile.id
  let resolvedDoctorId = doctorId;
  const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctorId } });
  if (doctorProfile) {
    resolvedDoctorId = doctorProfile.id;
  }

  const appointment = await prisma.appointment.create({
    data: {
      patientId: resolvedPatientId,
      doctorId: resolvedDoctorId,
      date,
      time: time || slot || '',
      type: type || 'In-Person',
      notes: notes || '',
      fee: fee || 0,
      status: status || 'Upcoming',
    },
  });

  return appointment;
};

export const updateAppointment = async (id: string, data: UpdateAppointmentInput) => {
  logger.info('Updating appointment', { id, status: data.status });

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: data.status },
  });

  if (data.status === 'Completed') {
    triggerAppointmentBillPdf(id).catch((err) => {
      logger.error('Background PDF generation failed', { id, error: err });
    });
  }

  return appointment;
};

export const deleteAppointment = async (id: string) => {
  logger.info('Deleting appointment', { id });

  const appointment = await prisma.appointment.delete({
    where: { id },
  });

  return appointment;
};
