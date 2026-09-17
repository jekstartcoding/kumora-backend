// Fase 5.2 — verifikasi JWT Supabase Auth dari header Authorization: Bearer <token>
// menggunakan Supabase Admin SDK (supabase.auth.getUser(token)).
// Tolak (401) kalau token invalid/expired.
//
// CATATAN EKSEKUSI: plan menempatkan file ini di Fase 5, tetapi semua endpoint
// /api/admin/* (Fase 3-4) wajib lewat middleware ini — stub 401 membuat Fase 3
// tidak bisa diuji sama sekali. Implementasi nyata ditarik maju ke sini sesuai
// deskripsi 5.2; Fase 5 tetap mengerjakan setup 2 user admin dan verifikasinya.
import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { fail } from '../utils/response';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res
      .status(401)
      .json(fail('UNAUTHORIZED', 'Header Authorization: Bearer <token> wajib disertakan'));
  }
  const token = header.slice('Bearer '.length).trim();

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res
      .status(401)
      .json(
        fail(
          'UNAUTHORIZED',
          `Token invalid atau expired: ${error?.message ?? 'user tidak ditemukan'}`
        )
      );
  }

  // User terverifikasi oleh Supabase Auth — lampirkan ke request untuk handler.
  (req as any).adminUser = { id: data.user.id, email: data.user.email };
  return next();
}
