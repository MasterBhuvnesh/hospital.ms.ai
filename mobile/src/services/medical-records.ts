import { API } from "../config/api";
import { apiRequest } from "./api";

export interface MedicalRecord {
  id: string;
  patientId: string;
  fileUrl: string;
  fileName?: string;
  createdAt: string;
}

export const medicalRecordService = {
  async list(patientId: string): Promise<MedicalRecord[]> {
    return apiRequest<MedicalRecord[]>(
      `${API.MEDICAL_RECORDS}/medical-records?patientId=${patientId}`
    );
  },

  async getById(id: string): Promise<MedicalRecord> {
    return apiRequest<MedicalRecord>(`${API.MEDICAL_RECORDS}/medical-records/${id}`);
  },

  async upload(patientId: string, fileUri: string, fileName: string): Promise<MedicalRecord> {
    const formData = new FormData();
    formData.append("patientId", patientId);
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: "application/octet-stream",
    } as any);

    const response = await fetch(`${API.MEDICAL_RECORDS}/medical-records/upload`, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`${API.MEDICAL_RECORDS}/medical-records/${id}`, {
      method: "DELETE",
    });
  },
};
