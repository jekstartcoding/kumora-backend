import express from 'express';
import cors from 'cors';
import { env } from './config/supabase';
import { ok, fail } from './utils/response';
import { ServiceError } from './utils/errors';
import { requireAdmin } from './middlewares/auth';
import productsRouter from './modules/products/routes';
import { deleteImage, reorderImage } from './modules/products/images';
import variantsRouter from './modules/variants/routes';
import reviewsRouter from './modules/reviews/routes';
import { mappingRouter, optionRouter } from './modules/quiz/routes';
import cmsRouter from './modules/cms/routes';

export function createApp() {
  const app = express();

  // Restrukturisasi arsitektur — admin panel kini hidup di frontend Kumora (origin
  // berbeda), jadi backend wajib mengizinkan origin tersebut via CORS. Whitelist
  // eksplisit dari env (KOMA dipisah koma) — TANPA wildcard '*'. Bila tidak ada
  // origin yang diset (mis. uji lokal via curl/Postman), header CORS tak ditambahkan
  // dan request non-browser tetap jalan normal.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS`));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());

  // Health-check sederhana: selain menandakan proses hidup (dipakai Railway
  // untuk monitoring uptime di Fase 10.1), endpoint ini memverifikasi bahwa
  // SUPABASE_URL + SUPABASE_SECRET_KEY valid dan bisa menjangkau REST API.
  app.get('/health', async (_req, res) => {
    try {
      const restRoot = `${env.supabaseUrl.replace(/\/+$/, '')}/rest/v1/`;
      const resp = await fetch(restRoot, {
        headers: {
          apikey: env.supabaseSecretKey,
          Authorization: `Bearer ${env.supabaseSecretKey}`,
        },
      });

      if (!resp.ok) {
        return res
          .status(503)
          .json(fail('SUPABASE_UNHEALTHY', `Supabase REST API merespons ${resp.status}`));
      }

      return res.json(ok({ status: 'ok', supabase: 'connected' }));
    } catch (err) {
      return res
        .status(503)
        .json(
          fail('SUPABASE_UNREACHABLE', `Tidak bisa terhubung ke Supabase: ${(err as Error).message}`)
        );
    }
  });

  // Fase 3.1/4.x — seluruh endpoint /api/admin/* wajib lewat verifikasi JWT admin.
  app.use('/api/admin/products', requireAdmin, productsRouter);
  app.use('/api/admin/variants', requireAdmin, variantsRouter);
  app.use('/api/admin/reviews', requireAdmin, reviewsRouter);
  app.use('/api/admin/quiz-options', requireAdmin, optionRouter);
  app.use('/api/admin/quiz-mappings', requireAdmin, mappingRouter);
  // Fase 3 plan CMS — seluruh endpoint /api/admin/cms/* di-balut requireAdmin.
  app.use('/api/admin/cms', requireAdmin, cmsRouter);

  // Fase 4.1 — images (di luar prefix products karena endpoint plan begitu).
  app.delete('/api/admin/images/:imageId', requireAdmin, deleteImage);
  app.patch('/api/admin/images/:imageId/reorder', requireAdmin, reorderImage);

  // 404 JSON untuk route API yang tidak dikenal.
  app.use('/api', (_req, res) => {
    return res.status(404).json(fail('NOT_FOUND', 'endpoint tidak ditemukan'));
  });

  // Error handler terakhir: ServiceError → status + envelope; lainnya → 500 generik.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ServiceError) {
      return res.status(err.status).json(fail(err.code, err.message));
    }
    // Error Multer (Fase 4.1): limit ukuran dan tipe file → 400 dengan pesan jelas.
    if (err && typeof err === 'object' && 'code' in err && String((err as any).code).startsWith('LIMIT_')) {
      return res.status(400).json(fail('FILE_TOO_LARGE', 'ukuran file melebihi batas 5MB'));
    }
    if (err instanceof Error && err.message.includes('jpg/png/webp')) {
      return res.status(400).json(fail('INVALID_FILE_TYPE', err.message));
    }
    // eslint-disable-next-line no-console
    console.error('[unhandled]', err);
    return res.status(500).json(fail('INTERNAL_ERROR', 'terjadi kesalahan internal'));
  });

  return app;
}
