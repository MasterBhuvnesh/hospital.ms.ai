import { API } from "../config/api";
import { apiRequest } from "./api";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  status: string;
  notes?: string;
  fee?: number;
  pdfUrl?: string;
  doctor?: {
    firstName: string;
    lastName: string;
    specialization: string;
  };
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  notes?: string;
  fee?: number;
}

export const appointmentService = {
  async list(patientId?: string): Promise<Appointment[]> {
    const query = patientId ? `?patientId=${patientId}` : "";
    return apiRequest<Appointment[]>(`${API.APPOINTMENT}/appointments${query}`);
  },

  async getById(id: string): Promise<Appointment> {
    return apiRequest<Appointment>(`${API.APPOINTMENT}/appointments/${id}`);
  },

  async create(payload: CreateAppointmentPayload): Promise<Appointment> {
    return apiRequest<Appointment>(`${API.APPOINTMENT}/appointments`, {
      method: "POST",
      body: payload,
    });
  },

  async updateStatus(id: string, status: string): Promise<Appointment> {
    return apiRequest<Appointment>(`${API.APPOINTMENT}/appointments/${id}`, {
      method: "PUT",
      body: { status },
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`${API.APPOINTMENT}/appointments/${id}`, {
      method: "DELETE",
    });
  },
};
