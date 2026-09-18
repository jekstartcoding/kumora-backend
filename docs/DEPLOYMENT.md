# Deploy Backend ke Render

Backend Kumora adalah REST API-only service (Express + Supabase). Panduan ini
mencakup deploy ke Render (free tier) dan bagaimana dev ↔ production tetap identik.

## Prinsip: kenapa dev == production

- **Database**: dev & production memakai **satu project Supabase yang sama**
  (`gfzlatthbgumketohkwn`). Schema (migrations 0001–0007) dan data (produk, CMS)
  identik 100% — tidak ada sinkronisasi yang perlu dilakukan.
- **Kode**: backend tanpa hardcode environment — semua config via env var
  (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
  `CORS_ORIGINS`, `PORT`). Kode yang jalan di lokal = kode di Render.
- **Migrations**: perubahan schema cukup lewat file di `supabase/migrations/`
  lalu `supabase db push` — production otomatis terdampak karena DB-nya sama.

## Langkah deploy (Render Dashboard)

1. **Push repo ini ke GitHub** (sudah — `jekstartcoding/kumora-backend`).

2. **Render Dashboard → New → Blueprint**, pilih repo `kumora-backend`.
   Blueprint `render.yaml` di root repo akan terdeteksi otomatis:
   - runtime: node, plan: free, region: singapore
   - build: `npm install && npm run build`
   - start: `npm run start` (= `node dist/server.js`)
   - health check: `/health`

   > Alternatif tanpa Blueprint: New → Web Service, lalu isi build/start command
   > dan env var manual — hasilnya sama.

3. **Isi environment variables** (Blueprint → Environment, atau tab Environment
   pada service). Semua bertanda `sync: false` wajib diisi:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | URL project Supabase (lihat `.env.example`) |
   | `SUPABASE_SECRET_KEY` | Secret key — **backend only, jangan pernah expose ke client** |
   | `SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `CORS_ORIGINS` | Origin frontend, koma, tanpa trailing slash |

   `PORT` **tidak perlu diisi** — Render meng-inject otomatis dan kode sudah
   membaca `process.env.PORT`.

   Contoh `CORS_ORIGINS` saat dev:
   ```
   http://localhost:5173,http://localhost:5174
   ```
   Setelah frontend production punya URL, tambahkan domainnya:
   ```
   http://localhost:5173,http://localhost:5174,https://kumora.example.com
   ```
   Perubahan env var otomatis me-restart service (tanpa redeploy).

4. **Create Resources** → tunggu build & deploy pertama selesai.

5. **Verifikasi**:
   ```bash
   curl https://<service-url>/health            # → JSON status healthy
   curl -i https://<service-url>/api/admin/products | head -1   # → 401 (tanpa token)
   ```

## Catatan free tier Render

- Free web service **spin down** setelah ±15 menit tanpa trafik; request
  berikutnya cold start beberapa detik. Untuk demo/profile ini umumnya cukup;
  upgrade ke plan berbayar jika butuh always-on.
- Free instance hanya punya **1 zone** — tidak memengaruhi perilaku aplikasi.

## Update aplikasi

Setiap push ke branch yang di-deploy (default `main`) otomatis memicu build &
deploy baru. Tidak ada langkah manual.

## Perubahan schema database

Semua lewat migration file (`supabase/migrations/`) + `supabase db push`
dari lokal — production memakai Supabase project yang sama, jadi tidak ada
langkah deploy DB terpisah.
