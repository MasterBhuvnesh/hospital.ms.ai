import { API } from "../config/api";
import { apiRequest } from "./api";

export interface Patient {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone?: string;
  vitals?: {
    bp?: string;
    hr?: number;
  };
}

export const patientService = {
  async getById(id: string): Promise<Patient> {
    return apiRequest<Patient>(`${API.PATIENT}/patients/${id}`);
  },

  async update(id: string, data: Partial<Patient>): Promise<Patient> {
    return apiRequest<Patient>(`${API.PATIENT}/patients/${id}`, {
      method: "PATCH",
      body: data,
    });
  },
};
