// Fase 4 — Multer, untuk terima file sebelum diteruskan ke Supabase Storage.
//
// Implementasi penuh di Fase 4.1. Stub ini hanya menjaga struktur folder sesuai plan 0.1.
import type { Request, Response, NextFunction } from 'express';

export function upload(_req: Request, res: Response, _next: NextFunction) {
  return res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Upload middleware belum diimplementasikan (Fase 4)' },
  });
}
