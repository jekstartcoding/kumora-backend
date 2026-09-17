// Fase 6.1 — axios instance ke backend Express (base path relatif, satu origin),
// auto-attach JWT dari sesi Supabase Auth ke setiap request.
// Kalau 401, sesi dianggap habis → kembalikan ke halaman login.
import axios from 'axios';
import { supabase } from './supabaseClient';

export const apiClient = axios.create({
  baseURL: '/api/admin',
});

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

// Semua endpoint backend membalas envelope ApiResponse<T> (plan 0.3).
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const resp = await apiClient.get<ApiEnvelope<T>>(path, { params });
  return resp.data.data as T;
}

export async function apiSend<T>(
  method: 'post' | 'patch' | 'delete',
  path: string,
  body?: unknown
): Promise<T> {
  const resp = await apiClient.request<ApiEnvelope<T>>({ method, url: path, data: body });
  return resp.data.data as T;
}

// Ambil pesan error yang ramah dari envelope 4xx/5xx.
export function apiErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: ApiEnvelope<unknown> } };
  return e.response?.data?.error?.message ?? 'Terjadi kesalahan tak terduga';
}
