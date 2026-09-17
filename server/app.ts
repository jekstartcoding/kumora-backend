import express from 'express';
import { env } from './config/supabase';
import { ok, fail } from './utils/response';

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
        .json(fail('SUPABASE_UNREACHABLE', `Tidak bisa terhubung ke Supabase: ${(err as Error).message}`));
    }
  });

  return app;
}
