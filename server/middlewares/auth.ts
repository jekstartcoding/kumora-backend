// Fase 5 — verifikasi JWT Supabase Auth dari header Authorization: Bearer <token>
// menggunakan Supabase Admin SDK (supabase.auth.getUser(token)).
// Tolak (401) kalau token invalid/expired.
//
// Implementasi penuh di Fase 5. Stub ini hanya menjaga struktur folder sesuai plan 0.1.
import type { Request, Response, NextFunction } from 'express';

export function requireAdmin(_req: Request, res: Response, _next: NextFunction) {
  return res.status(401).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Auth middleware belum diimplementasikan (Fase 5)' },
  });
}
