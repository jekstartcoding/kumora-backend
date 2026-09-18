# Kumora — Backend (REST API)

Backend Kumora: REST API-only service (Express + TypeScript) yang melayani
seluruh operasi tulis/kelola untuk situs Kumora — katalog produk, varian,
review, quiz, dan CMS konten. **Read publik tidak melewati backend** (frontend
membaca langsung dari Supabase, dijamin RLS); backend adalah satu-satunya jalur
tulis, dijaga JWT admin.

> Repo ini (`kumora-backend`) berdiri sendiri. Frontend-nya ada di repo
> [`kumora-company-profile-web`](https://github.com/jekstartcoding/kumora-company-profile-web).
> Panduan deploy: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · dokumentasi
> pendukung: [`docs/`](docs/) (RLS notes, constraints, Postman collection).

## Arsitektur

```
Admin Panel (frontend /admin)
   │  Authorization: Bearer <JWT Supabase Auth>
   ▼
Express API (ini repo, deploy di Render)
   │  middleware requireAdmin → verifikasi JWT via Supabase Admin SDK
   │  validasi bisnis di service layer
   ▼
Supabase (Secret key) ──> Postgres + Storage (product-images, cms-images)
```

- **Auth**: JWT dari Supabase Auth diverifikasi `supabase.auth.getUser(token)`;
  invalid/expired → 401.
- **Response envelope** konsisten: sukses `{ success: true, data: ... }`,
  gagal `{ success: false, error: { code, message } }`.
- **Validasi bisnis** hidup di backend (bukan frontend): texture image wajib,
  fallback quiz terakhir tak boleh dihapus, URL CTA valid, dsb — lihat
  [`docs/APPLICATION_CONSTRAINTS.md`](docs/APPLICATION_CONSTRAINTS.md).

## Tech stack

- Node.js (≥20; dev memakai 24) + TypeScript + Express 5
- `@supabase/supabase-js` (Secret key, server-only)
- `cors` (whitelist origin dari env, tanpa wildcard), `multer` (upload gambar),
  `dotenv`
- Build: `tsc` → `dist/`, runtime: `node dist/server.js`

## Environment variables

Salin `.env.example` ke `.env`:

| Variable | Fungsi |
|---|---|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SECRET_KEY` | Secret key — **server-only, jangan pernah expose ke client** |
| `SUPABASE_PUBLISHABLE_KEY` | Dipakai `/health` untuk cek koneksi |
| `PORT` | Port HTTP (dev: 3000; production di-inject Render otomatis) |
| `CORS_ORIGINS` | Origin frontend yang diizinkan, koma, tanpa trailing slash |

Contoh `CORS_ORIGINS`:
```
http://localhost:5173,http://localhost:5174,https://www.kumora.id,https://kumora.id
```

## Menjalankan

```bash
npm install
npm run dev           # tsx watch (development, port 3000)
npm run build         # tsc → dist/
npm run start         # node dist/server.js (production)
npm run typecheck     # tsc --noEmit
```

## Endpoint

Semua di bawah `/api/admin/*` memerlukan header `Authorization: Bearer <JWT>`
(kecuali `/health`). Postman collection: [`docs/postman/`](docs/postman/).

### Health
| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | Status server + koneksi Supabase |

### Products & gambar & varian
| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/admin/products` | List produk (dengan images/variants/reviews) |
| POST | `/api/admin/products` | Create produk (validasi: minimal 1 texture image) |
| GET / PATCH / DELETE | `/api/admin/products/:id` | Detail / update / delete (delete ikut hapus file Storage) |
| POST | `/api/admin/products/:id/images` | Upload gambar → Storage `product-images` |
| PATCH | `/api/admin/variants/:id` | Update varian |
| PATCH | `/api/admin/products/:id/variants/:variantId/set-default` | Set default variant (transaksional via RPC) |
| POST / PATCH / DELETE | `/api/admin/variants`, `/api/admin/variants/:id` | CRUD varian standalone |
| POST / PATCH / DELETE | `/api/admin/reviews`, `/api/admin/reviews/:id` | CRUD review |

### Quiz
| Method | Path | Keterangan |
|---|---|---|
| GET / POST / PATCH / DELETE | `/api/admin/quiz-options`, `/api/admin/quiz-options/:id` | Opsi per step quiz |
| GET / POST / PATCH / DELETE | `/api/admin/quiz-mappings`, `/api/admin/quiz-mappings/:id` | Mapping kombinasi → produk. Validasi: minimal 1 mapping `is_fallback = true` selalu ada |

### CMS Konten
| Method | Path | Keterangan |
|---|---|---|
| GET / PUT | `/api/admin/cms/<slug>` | Singleton (14 konten: home-hero, home-showcase-section, … about-cta). PUT = **upsert** row id=1 |
| GET / POST / PATCH / DELETE | `/api/admin/cms/<slug>`, `/<slug>/:id` | List repeater (6 konten: showcase produk, trust items, testimoni, milestones, mission items, nilai utama) |
| PATCH | `/api/admin/cms/<slug>/reorder` | Reorder batch `[{id, order_index}]` (tolak duplikat) |
| GET / PATCH | `/api/admin/cms/category-content`, `/category-content/:category` | Konten 3 kategori (row terkunci per kategori) |

Validasi CMS: URL CTA harus path relatif `/...` atau `http(s)://...`;
`order_index` tanpa duplikat.

## Database & migrations

Schema **wajib** lewat migration file di `supabase/migrations/` (bukan edit
manual di Studio):

| Migration | Isi |
|---|---|
| `0001_init_products.sql` | Tabel produk + variants + images + reviews + quiz |
| `0002_enable_rls.sql` | RLS + policy public read-only |
| `0003_set_default_variant_fn.sql` | Function transaksional set-default variant |
| `0004_storage_bucket.sql` | Bucket Storage `product-images` (public) |
| `0005_cms_content.sql` | 19 tabel CMS (singleton `id=1 check`, child `order_index`, category_content) |
| `0006_cms_rls.sql` | RLS CMS (testimonials khusus: read publik hanya `is_published = true`) |
| `0007_cms_images_bucket.sql` | Bucket Storage `cms-images` (public) |

Apply migration:
```bash
export SUPABASE_ACCESS_TOKEN=<token>
npx supabase link --project-ref <ref>   # sekali
npx supabase db push
```

Seed data: `supabase/seed/0002_cms_content_seed.sql` (referensi SQL) dieksekusi
via `scripts/seed-cms-content.ts` (idempoten; `WHATSAPP_NUMBER` diekstrak dari
frontend, showcase dari slug produk asli). Script utilitas lain:
`scripts/verify-cms-*.ts`, `scripts/upload-cms-images.ts`, `scripts/e2e-cms-fase8.ts`.

## Deploy (Render)

Blueprint `render.yaml` tersedia: New → Blueprint di Render, pilih repo ini,
isi env var, selesai. Health check path: `/health`. Detail lengkap + catatan
free tier (spin down setelah idle): [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Dev & production memakai **satu project Supabase yang sama**, jadi schema dan
data identik; yang membedakan hanya env var.
