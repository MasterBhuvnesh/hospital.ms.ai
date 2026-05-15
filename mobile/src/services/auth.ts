import { API } from "../config/api";
import {
  apiRequest,
  removeToken,
  removeUserData,
  setToken,
  setUserData,
} from "./api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>(`${API.AUTH}/auth/login`, {
      method: "POST",
      body: payload,
    });
    await setToken(data.token);
    await setUserData(data.user);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>(`${API.AUTH}/auth/register`, {
      method: "POST",
      body: payload,
    });
    await setToken(data.token);
    await setUserData(data.user);
    return data;
  },

  async logout(): Promise<void> {
    await removeToken();
    await removeUserData();
  },
};
