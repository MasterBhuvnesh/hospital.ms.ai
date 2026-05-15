import { API } from "../config/api";
import { apiRequest } from "./api";

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medicineId: string;
  quantity: number;
  status: string;
  instructions?: string | null;
  pdfUrl?: string | null;
  issuedAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };
  medicine?: {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
  };
}

export const prescriptionService = {
  async list(patientId?: string): Promise<Prescription[]> {
    const query = patientId ? `?patientId=${patientId}` : "";
    return apiRequest<Prescription[]>(`${API.PRESCRIPTION}/prescriptions${query}`);
  },

  async getById(id: string): Promise<Prescription> {
    return apiRequest<Prescription>(`${API.PRESCRIPTION}/prescriptions/${id}`);
  },

  async updateStatus(id: string, status: string): Promise<Prescription> {
    return apiRequest<Prescription>(`${API.PRESCRIPTION}/prescriptions/${id}`, {
      method: "PATCH",
      body: { status },
    });
  },
};
