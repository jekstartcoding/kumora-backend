import express from 'express';
import { env } from './config/supabase';
import { ok, fail } from './utils/response';
import { ServiceError } from './utils/errors';
import { requireAdmin } from './middlewares/auth';
import productsRouter from './modules/products/routes';

export function createApp() {
  const app = express();

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

  // Fase 3.1 — seluruh endpoint /api/admin/* wajib lewat verifikasi JWT admin.
  app.use('/api/admin/products', requireAdmin, productsRouter);

  // 404 JSON untuk route API yang tidak dikenal.
  app.use('/api', (_req, res) => {
    return res.status(404).json(fail('NOT_FOUND', 'endpoint tidak ditemukan'));
  });

  // Error handler terakhir: ServiceError → status + envelope; lainnya → 500 generik.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ServiceError) {
      return res.status(err.status).json(fail(err.code, err.message));
    }
    // eslint-disable-next-line no-console
    console.error('[unhandled]', err);
    return res.status(500).json(fail('INTERNAL_ERROR', 'terjadi kesalahan internal'));
  });

  return app;
}
