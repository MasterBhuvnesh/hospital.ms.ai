const BASE_URL = process.env.SERVICES_BASE_URL || 'http://localhost';

export const SERVICES = {
  appointment: `${BASE_URL}:${process.env.APPOINTMENT_SERVICE_PORT || '3001'}`,
  auth: `${BASE_URL}:${process.env.AUTH_SERVICE_PORT || '3002'}`,
  doctor: `${BASE_URL}:${process.env.DOCTOR_SERVICE_PORT || '3003'}`,
  message: `${BASE_URL}:${process.env.MESSAGE_SERVICE_PORT || '3004'}`,
  patient: `${BASE_URL}:${process.env.PATIENT_SERVICE_PORT || '3005'}`,
  prescription: `${BASE_URL}:${process.env.PRESCRIPTION_SERVICE_PORT || '3006'}`,
  medicalRecords: `${BASE_URL}:${process.env.MEDICAL_RECORDS_SERVICE_PORT || '3009'}`,
};
