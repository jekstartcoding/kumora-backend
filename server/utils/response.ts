// Response envelope seragam untuk semua endpoint (plan 0.3):
//
//   interface ApiResponse<T> {
//     success: boolean;
//     data?: T;
//     error?: { code: string; message: string };
//   }
//
// Dipakai konsisten oleh semua endpoint dari Fase 2 dan seterusnya.

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}
