import { API } from "../config/api";
import { apiRequest } from "./api";

export interface Vitals {
  bp?: string;
  hr?: number;
  spo2?: number;
  temperature?: number;
  weight?: number;
  height?: number;
}

export interface Patient {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone?: string | null;
  vitals?: Vitals | null;
}

export interface UpdatePatientPayload {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  vitals?: Vitals;
}

export const patientService = {
  async getByUserId(userId: string): Promise<Patient> {
    const patients = await apiRequest<Patient[]>(`${API.PATIENT}/patients`);
    const patient = patients.find((p) => p.userId === userId);
    if (!patient) throw new Error("Patient not found");
    return patient;
  },

  async update(id: string, payload: UpdatePatientPayload): Promise<Patient> {
    return apiRequest<Patient>(`${API.PATIENT}/patients/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
};
