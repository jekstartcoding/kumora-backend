// Fase 4.1 — Multer, untuk terima file sebelum diteruskan ke Supabase Storage.
// Validasi: hanya tipe gambar umum (jpg/png/webp), ukuran maksimal 5MB supaya
// Storage tidak membengkak tanpa kontrol.
import multer from 'multer';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Hanya file gambar jpg/png/webp yang diizinkan'));
    }
    return cb(null, true);
  },
});
