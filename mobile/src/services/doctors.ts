import { API } from "../config/api";
import { apiRequest } from "./api";

export interface Doctor {
  id: string;
  userId?: string;
  name: string;
  firstName: string;
  lastName: string;
  specialization: string;
  specialty: string;
  licenseNumber: string;
  phone?: string;
  rating: number;
  exp: string;
  available: boolean;
  fee: number;
  img?: string;
}

export const doctorService = {
  async list(): Promise<Doctor[]> {
    return apiRequest<Doctor[]>(`${API.DOCTOR}/doctors`);
  },

  async getById(id: string): Promise<Doctor> {
    return apiRequest<Doctor>(`${API.DOCTOR}/doctors/${id}`);
  },
};
