# Implementation Plan — Backend & Admin Panel Kumora — FINAL
**Proyek:** Kumora (Backend + CMS Internal)
**Stack:** Express + TypeScript + Supabase (Postgres, Auth, Storage) + Admin panel custom (React, gaya Filament)
**Repo:** **Satu repo monorepo** (`kumora-backend`) berisi Express API dan admin panel React — tidak ada repo terpisah untuk admin panel.
**Scope:** Backend API + admin panel internal untuk kelola data produk. **Tidak menyentuh** frontend customer-facing yang sudah dirombak di `KUMORA_UX_MIGRATION_IMPLEMENTATION_PLAN_FINAL.md` — dokumen ini murni menambah kemampuan CMS di atasnya.
**Skala target:** 10-15 produk, dipakai oleh developer + pemilik website saja (bukan tim editorial besar).

> **Keputusan yang mengunci scope dokumen ini:**
> 1. Backend Express **hanya** menangani jalur admin/write (CRUD produk, upload gambar, quiz mapping). Jalur **read** untuk situs customer-facing tetap langsung ke Supabase (REST/JS client dengan RLS public read) — bukan lewat backend, supaya tidak ada hop network yang tidak perlu untuk pengunjung situs.
> 2. Admin panel dibangun **custom**, bukan generator otomatis dari library admin generik — tapi mengambil *bahasa visual* Filament: tabel resource yang rapi, form generation per-field-type, sidebar navigasi resource, tanpa perlu effort membangun framework admin dari nol.
> 3. Karena skala kecil (10-15 produk, 2 pengguna), **tidak ada** role-based permission bertingkat di v1 — cukup satu level akses "admin" via Supabase Auth. Kalau nanti butuh multi-role, itu jadi perubahan scope terpisah.
> 4. **Satu repo, satu deployment.** Admin panel (React) di-build jadi static file dan di-serve langsung oleh Express di route `/admin` — bukan hosting terpisah. Ini menyederhanakan Fase 6 (struktur project) dan Fase 10 (deployment) dibanding rencana repo-terpisah sebelumnya.
> 5. **Penamaan kredensial Supabase mengikuti dashboard terbaru**: yang sebelumnya disebut "anon key" sekarang muncul di dashboard sebagai **Publishable key**, dan "service_role key" sekarang muncul sebagai **Secret key**. Fungsinya identik dengan yang dijelaskan di dokumen ini — hanya labelnya yang berubah. "Project URL" juga bisa muncul dengan label **API URL** tergantung versi dashboard; keduanya merujuk ke hal yang sama (`https://xxxxxxxxxxxxx.supabase.co`).

---

## 0. Prinsip Kerja

1. **Schema Postgres adalah turunan langsung dari `Product` interface**, bukan didesain ulang dari nol. Interface `Product` final (hasil `KUMORA_UX_MIGRATION_IMPLEMENTATION_PLAN_FINAL.md` Fase 0.4) adalah kontrak — tabel database harus bisa merepresentasikan seluruh field itu tanpa kompromi, karena frontend customer sudah dibangun mengasumsikan bentuk data itu.
2. **RLS (Row Level Security) adalah lapisan keamanan utama, bukan opsional.** Karena situs customer akan baca langsung dari Supabase tanpa lewat backend, kesalahan RLS berarti kebocoran keamanan langsung ke publik. Setiap tabel wajib punya policy eksplisit sebelum dianggap selesai — tidak ada tabel yang "dibiarkan default" tanpa RLS didefinisikan sadar.
3. **Backend adalah tempat logic bisnis hidup, bukan sekadar proxy CRUD.** Validasi seperti "gift-safe note wajib kalau isSafe true", "minimal 1 texture image", "hanya 1 variant boleh jadi default" — semua ini ditegakkan di backend, bukan diserahkan ke frontend admin untuk divalidasi sendiri-sendiri.
4. **Migration-first.** Semua perubahan schema lewat file migration Supabase (`supabase/migrations/`) yang bisa direview dan di-rollback, bukan mengedit tabel langsung lewat Studio UI untuk perubahan struktural.
5. **Admin panel mengikuti pola resource seragam.** Setiap entity (Product, Variant, Review, Quiz Mapping) punya struktur resource yang konsisten: List view (tabel) → Form view (create/edit) → Delete confirmation. Developer yang menambah resource baru di masa depan tinggal ikut pola yang sama, tidak menciptakan pola UI baru per-resource.
6. **Non-destruktif terhadap frontend customer.** Endpoint dan schema tidak boleh mengubah bentuk data yang sudah dikonsumsi frontend (field name, tipe) tanpa update bersamaan ke frontend — kalau ada penyesuaian nama field yang tidak terhindarkan, itu dikoordinasikan eksplisit, bukan silent breaking change.
7. **Definition of Done tiap fase:** dapat diuji lewat Postman/REST client secara independen (untuk fase backend) atau diverifikasi visual di browser (untuk fase admin panel), tanpa bergantung total pada fase berikutnya.

---

## Fase 0 — Setup Proyek & Koneksi Supabase

**Tujuan:** Fondasi project Express + koneksi Supabase siap, sebelum satu tabel/endpoint pun dibuat.

### 0.1 Struktur project (monorepo — backend + admin panel dalam satu repo)
```
kumora-backend/
├── server/                     # Express API
│   ├── config/
│   │   └── supabase.ts        # Supabase client (secret key, dipakai backend only)
│   ├── middlewares/
│   │   ├── auth.ts            # verifikasi Supabase Auth JWT admin
│   │   └── upload.ts          # Multer, untuk terima file sebelum diteruskan ke Supabase Storage
│   ├── modules/
│   │   ├── products/
│   │   ├── variants/
│   │   ├── reviews/
│   │   └── quiz/
│   ├── utils/
│   │   └── response.ts        # response envelope seragam, dipakai semua endpoint
│   └── app.ts                 # juga serve static build dari admin/dist di route /admin (lihat Fase 10.2)
├── admin/                       # React admin panel (dibangun di Fase 6-8)
│   ├── src/
│   └── index.html
├── supabase/
│   └── migrations/
├── .env.example
└── package.json
```
- Satu `package.json` di root cukup (dengan workspace sederhana atau cukup dua build script terpisah — `npm run build:server` dan `npm run build:admin`), tidak perlu monorepo tooling berat (Turborepo/Nx) untuk skala sekecil ini.

### 0.2 Environment & keamanan kunci

> Catatan penamaan: dashboard Supabase saat ini menampilkan istilah **Publishable key** (dulu disebut "anon key") dan **Secret key** (dulu disebut "service_role key"). Kedua nama merujuk ke kredensial yang sama — dokumen ini akan konsisten memakai nama yang tampil di dashboard.

- Backend memakai **Secret key** (bukan Publishable key) — karena backend butuh bypass RLS untuk operasi admin (mis. create produk sebelum ada reviewer publik). Secret key **hanya** hidup di environment variable server (Railway), **tidak pernah** dikirim ke admin panel dalam bentuk apapun, meski admin panel ada di repo yang sama — tetap harus lewat build process yang benar (env server-side, bukan `VITE_`/`NEXT_PUBLIC_`-style env yang ke-embed ke bundle client).
- Admin panel (bagian frontend dari monorepo ini) autentikasi lewat Supabase Auth memakai **Publishable key**, lalu setiap request ke backend Express menyertakan JWT dari sesi Supabase Auth tersebut — backend yang verifikasi JWT ini di `middlewares/auth.ts`, bukan mempercayai request begitu saja.
- `.env.example` di root mendaftar:
  ```
  SUPABASE_URL=              # "API URL" di dashboard Supabase
  SUPABASE_SECRET_KEY=       # backend only — JANGAN pernah masuk ke bundle admin panel
  SUPABASE_PUBLISHABLE_KEY=  # dipakai admin panel untuk login, aman di client-side
  PORT=
  ```

### 0.3 `server/utils/response.ts` — response envelope
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}
```
Dipakai konsisten oleh semua endpoint dari Fase 2 dan seterusnya.

### 0.4 Deliverable Fase 0
- [ ] `kumora-backend` project jalan lokal (`npm run dev`), terhubung ke Supabase project (cek lewat endpoint health-check sederhana)
- [ ] Environment variables terpisah jelas sesuai 0.2, didokumentasikan di `.env.example`, `.env` asli masuk `.gitignore`
- [ ] Response envelope disepakati dan didokumentasikan

---

## Fase 1 — Desain Schema Database (Postgres via Supabase)

**Tujuan:** Menerjemahkan `Product` interface (dari implementation plan frontend) jadi tabel-tabel Postgres, dengan migration eksplisit.

### 1.1 Skema tabel

```sql
-- supabase/migrations/0001_init_products.sql

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('pillows', 'bolsters', 'beds')),
  tags text[] default '{}',                    -- ["cover"] / ["sheet"], metadata migrasi kategori lama
  price numeric(12,2) not null,
  sensory_descriptor text not null,
  firmness_rating int not null check (firmness_rating between 1 and 5),
  fill_material text not null,
  fill_weight_equivalent text not null,
  delivery_estimate text not null,
  return_policy_text text not null,
  gift_safe boolean default false,
  gift_safe_note text,
  brand_story_line text not null,
  description text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  url text not null,
  image_type text not null check (image_type in ('lifestyle', 'texture')),
  order_index int default 0
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  label text not null,          -- contoh: "Firm — 60x40cm"
  price numeric(12,2) not null,
  is_default boolean default false
);

create table product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  author text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  sleep_position text check (sleep_position in ('Terlentang', 'Menyamping', 'Tengkurap')),
  body_type text check (body_type in ('Ringan', 'Sedang', 'Berat')),
  created_at timestamptz default now()
);

create table quiz_options (
  id uuid primary key default gen_random_uuid(),
  step_id text not null,        -- contoh: "sleep_position", "firmness_pref", "category_pref"
  option_id text not null,
  label text not null,
  order_index int default 0
);

create table quiz_mappings (
  id uuid primary key default gen_random_uuid(),
  answer_combination jsonb not null,   -- contoh: {"sleep_position": "menyamping", "firmness_pref": "soft"}
  product_id uuid references products(id),
  is_fallback boolean default false    -- wajib ada minimal 1 row is_fallback = true
);
```

### 1.2 Constraint tambahan (application-level, didokumentasikan untuk Fase 2)
Beberapa aturan tidak murni bisa ditegakkan lewat SQL constraint biasa, jadi wajib divalidasi di backend (Fase 2.3):
- Setiap produk minimal punya 1 row `product_images` dengan `image_type = 'texture'`.
- Setiap produk minimal punya 1 `product_variants` dengan `is_default = true`, dan **hanya boleh 1** yang default.
- Kalau `gift_safe = true`, `gift_safe_note` tidak boleh null/kosong.
- Tabel `quiz_mappings` wajib punya minimal 1 row dengan `is_fallback = true` — kalau tidak, quiz di frontend bisa gagal total tanpa hasil (lihat Fase 6 di plan frontend).

### 1.3 Deliverable Fase 1
- [ ] Migration file final di `supabase/migrations/`, dijalankan lewat Supabase CLI (`supabase db push` atau `migrate up`, bukan edit manual lewat Studio)
- [ ] Skema diverifikasi lewat Supabase Studio (Table Editor) — struktur tabel & relasi sudah sesuai
- [ ] Daftar constraint application-level (1.2) didokumentasikan untuk dipakai di Fase 2

---

## Fase 2 — Row Level Security (RLS) & Kebijakan Akses

**Tujuan:** Memastikan situs customer bisa baca data publik langsung dari Supabase dengan aman, sementara operasi tulis hanya bisa lewat backend dengan Service Role Key.

### 2.1 Aktifkan RLS di semua tabel
```sql
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table product_reviews enable row level security;
alter table quiz_options enable row level security;
alter table quiz_mappings enable row level security;
```

### 2.2 Policy public read-only
```sql
create policy "public_read_products" on products
  for select using (true);

create policy "public_read_product_images" on product_images
  for select using (true);

create policy "public_read_product_variants" on product_variants
  for select using (true);

create policy "public_read_product_reviews" on product_reviews
  for select using (true);

create policy "public_read_quiz_options" on quiz_options
  for select using (true);

create policy "public_read_quiz_mappings" on quiz_mappings
  for select using (true);
```
- **Tidak ada policy `insert`/`update`/`delete` untuk publik** di tabel manapun — satu-satunya jalan tulis adalah lewat backend Express yang memakai **Secret key** (yang secara desain Supabase **bypass RLS**).

### 2.3 Verifikasi kritis
- [ ] Coba `insert` langsung dari Publishable key (simulasikan seperti dari browser customer) ke tabel `products` — **harus ditolak**.
- [ ] Coba `select` dari Publishable key ke semua tabel di atas — **harus berhasil**, karena inilah yang dipakai frontend customer.

### 2.4 Deliverable Fase 2
- [ ] Seluruh tabel RLS aktif, teruji public read jalan, public write ditolak
- [ ] Dokumentasi singkat `RLS_POLICY_NOTES.md` — daftar tabel dan policy yang berlaku, untuk referensi kalau nanti ada tabel baru ditambah

---

## Fase 3 — Backend API: Module Products (CRUD Inti)

**Tujuan:** Endpoint CRUD produk yang dipakai admin panel, dengan validasi bisnis dari Fase 1.2 ditegakkan di sini.

### 3.1 Endpoint

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/admin/products` | List semua produk (untuk tabel admin panel), support `?category=` filter |
| GET | `/api/admin/products/:id` | Detail 1 produk beserta images, variants, reviews (join) |
| POST | `/api/admin/products` | Create produk baru |
| PATCH | `/api/admin/products/:id` | Update produk |
| DELETE | `/api/admin/products/:id` | Hapus produk (cascade ke images/variants/reviews) |

Semua endpoint di atas **wajib** lewat `middlewares/auth.ts` (verifikasi JWT admin) — tidak ada endpoint publik di prefix `/api/admin/*`.

### 3.2 Validasi conditional di POST/PATCH
- `category` harus salah satu dari `pillows`/`bolsters`/`beds` — tolak selain itu (400).
- `gift_safe: true` tanpa `gift_safe_note` → tolak (400), pesan error jelas: "gift_safe_note wajib diisi kalau gift_safe true".
- `firmness_rating` di luar rentang 1-5 → tolak (400).
- Slug otomatis di-generate dari `name` kalau tidak disediakan eksplisit (slugify + cek uniqueness, kalau bentrok tambahkan suffix angka).

### 3.3 Business logic: variant default
- Endpoint `PATCH /api/admin/products/:id/variants/:variantId/set-default` — set satu variant jadi default, otomatis meng-unset variant lain yang sebelumnya default (dalam satu transaction, bukan dua query terpisah yang bisa race condition).

### 3.4 Deliverable Fase 3
- [ ] Seluruh endpoint CRUD produk berfungsi dan tervalidasi, diuji lewat Postman collection (`docs/postman/products-admin.json`)
- [ ] Coba kirim `category` invalid → ditolak; coba `gift_safe: true` tanpa note → ditolak
- [ ] Set-default variant teruji tidak menghasilkan 2 variant default sekaligus

---

## Fase 4 — Backend API: Images, Variants, Reviews, Quiz Mapping

**Tujuan:** Melengkapi endpoint untuk entity pendukung yang belum dicakup Fase 3.

### 4.1 Upload gambar ke Supabase Storage
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/admin/products/:id/images` | Upload file (Multer) → backend teruskan ke Supabase Storage bucket `product-images` → simpan URL hasil ke `product_images` dengan `image_type` (`lifestyle`/`texture`) |
| DELETE | `/api/admin/images/:imageId` | Hapus record + file di Storage |
| PATCH | `/api/admin/images/:imageId/reorder` | Update `order_index` |

- Validasi: tolak upload kalau bukan tipe file gambar umum (jpg/png/webp), batasi ukuran file wajar (mis. 5MB) supaya Storage tidak membengkak tanpa kontrol.
- Saat delete produk terakhir kalinya, pastikan file di Storage ikut terhapus (bukan cuma record DB) — cegah file orphan menumpuk di bucket.

### 4.2 Endpoint Variants & Reviews (standalone CRUD, bukan cuma nested di product)
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST/PATCH/DELETE | `/api/admin/variants/:id` | CRUD variant per produk |
| POST/PATCH/DELETE | `/api/admin/reviews/:id` | CRUD review per produk |

### 4.3 Endpoint Quiz Options & Mapping
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET/POST/PATCH/DELETE | `/api/admin/quiz-options` | Kelola pilihan jawaban per step quiz |
| GET/POST/PATCH/DELETE | `/api/admin/quiz-mappings` | Kelola mapping kombinasi jawaban → produk |

- **Validasi kritis**: sebelum izinkan hapus row `quiz_mappings` dengan `is_fallback = true`, cek dulu apakah itu satu-satunya fallback yang ada — kalau ya, tolak hapus (400, pesan: "minimal harus ada 1 fallback mapping"). Ini mencegah situasi quiz di frontend customer gagal total karena admin tidak sadar menghapus satu-satunya fallback.

### 4.4 Deliverable Fase 4
- [ ] Upload gambar berfungsi end-to-end (file masuk Storage, URL tersimpan, tampil di admin panel nantinya)
- [ ] CRUD variant, review, quiz option, quiz mapping semua berfungsi dan tervalidasi
- [ ] Percobaan hapus fallback terakhir → ditolak dengan pesan jelas

---

## Fase 5 — Autentikasi Admin

**Tujuan:** Login untuk 2 pengguna (developer + pemilik website), tanpa role bertingkat (sesuai keputusan scope).

### 5.1 Setup Supabase Auth
- Buat 2 user secara manual lewat Supabase Studio (Auth → Users) — **tidak perlu** halaman register publik, karena hanya 2 orang yang akan pernah punya akses.
- Login dilakukan di admin panel via `supabase-js` client (`signInWithPassword`, diinisialisasi dengan **Publishable key**), bukan custom auth di backend Express — reuse mekanisme Supabase Auth yang sudah matang, backend cukup verifikasi JWT yang dihasilkan.

### 5.2 `middlewares/auth.ts`
```typescript
// Verifikasi JWT dari header Authorization: Bearer <token>
// menggunakan Supabase Admin SDK (supabase.auth.getUser(token))
// Tolak (401) kalau token invalid/expired.
```

### 5.3 Deliverable Fase 5
- [ ] 2 akun admin bisa login dari admin panel
- [ ] Request ke `/api/admin/*` tanpa token valid → 401
- [ ] Token expired/invalid ditangani dengan pesan jelas, bukan 500 error generik

---

## Fase 6 — Admin Panel: Fondasi (Gaya Filament)

**Tujuan:** Membangun kerangka admin panel dengan pola resource seragam, terinspirasi struktur Filament (sidebar resource, tabel list, form generation).

### 6.1 Struktur project admin panel (folder `admin/` di dalam repo `kumora-backend` yang sama)
```
kumora-backend/
└── admin/
    ├── src/
    │   ├── layouts/
    │   │   └── AdminLayout.tsx        # sidebar navigasi resource + topbar (logout, user info)
    │   ├── components/
    │   │   ├── ResourceTable.tsx      # tabel generik: kolom, sorting, aksi (edit/delete)
    │   │   ├── ResourceForm.tsx       # form generator dari field schema, gaya Filament form builder
    │   │   └── ImageUploader.tsx      # drag-drop upload, preview, reorder
    │   ├── resources/
    │   │   ├── products/
    │   │   ├── quizMappings/
    │   │   └── quizOptions/
    │   ├── lib/
    │   │   ├── supabaseClient.ts      # inisialisasi dengan Publishable key, untuk auth saja
    │   │   └── apiClient.ts           # axios instance ke backend Express (base path relatif, karena satu origin), auto-attach JWT
    │   └── App.tsx
    ├── index.html
    └── vite.config.ts
```
- Karena admin panel dan backend satu repo dan (setelah Fase 10) satu origin deployment, `apiClient.ts` cukup memakai path relatif (`/api/admin/...`) tanpa perlu konfigurasi CORS lintas domain yang rumit.

### 6.2 Pola "Resource" (meniru konsep Filament Resource)
Setiap resource (Product, Quiz Mapping, dst) didefinisikan sebagai satu config object:
```typescript
interface ResourceConfig<T> {
  name: string;
  endpoint: string;
  columns: { key: keyof T; label: string; render?: (row: T) => ReactNode }[];
  formFields: FormFieldConfig[];  // text, number, select, textarea, image-upload, toggle, repeater
}
```
- `ResourceTable` dan `ResourceForm` generik membaca config ini — menambah resource baru di masa depan (misal kalau nanti mau tambah entity lain) tinggal bikin 1 config file baru, bukan bikin halaman UI dari nol tiap kali. Ini yang bikin polanya terasa seperti Filament: developer mendeklarasikan schema, UI-nya otomatis terbentuk.

### 6.3 `AdminLayout` — sidebar navigasi
- Sidebar statis berisi: Products, Quiz Options, Quiz Mappings (3 resource utama, sesuai skala 10-15 produk yang tidak butuh navigasi kompleks).
- Topbar: nama user login, tombol logout.

### 6.4 Auth guard
- Route admin dibungkus guard yang cek sesi Supabase Auth — kalau belum login, redirect ke `/admin/login`.

### 6.5 Deliverable Fase 6
- [ ] Admin panel bisa diakses, login/logout berfungsi
- [ ] `AdminLayout` dengan sidebar 3 resource tampil
- [ ] `ResourceTable` dan `ResourceForm` generik siap dipakai resource pertama (Fase 7)

---

## Fase 7 — Admin Panel: Resource Products (Lengkap)

**Tujuan:** Resource paling kompleks — mencakup semua field `Product`, termasuk nested data (images, variants, reviews).

### 7.1 List view (`ResourceTable` untuk Products)
Kolom yang ditampilkan: thumbnail (lifestyle image pertama), name, category, price, jumlah variant, aksi (Edit/Delete).

### 7.2 Form view — dibagi jadi beberapa section (gaya Filament tabs/sections)
- **Section "Basic Info"**: name, slug (auto-generate tapi bisa di-override manual), category (select 3 pilihan), price, description, brand_story_line.
- **Section "Sensory Spec"**: sensory_descriptor, firmness_rating (slider 1-5), fill_material, fill_weight_equivalent.
- **Section "Logistics"**: delivery_estimate, return_policy_text.
- **Section "Gift"**: toggle gift_safe, textarea gift_safe_note (muncul kondisional hanya kalau toggle aktif — mirror validasi backend di Fase 3.2 supaya admin dapat feedback instan, bukan baru tahu setelah submit ditolak).
- **Section "Images"**: `ImageUploader` dua grup terpisah — Lifestyle Images dan Texture Images — dengan reorder drag-drop, tombol hapus per gambar, indikator jelas "minimal 1 texture image wajib" sebelum submit diizinkan.
- **Section "Variants"**: repeater field (tambah/hapus baris), tiap baris: label, price, radio "jadikan default" (hanya 1 yang bisa aktif dalam repeater ini di sisi UI, sebelum dikirim ke endpoint set-default Fase 3.3).
- **Section "Reviews"**: repeater sederhana untuk tambah/edit review manual (author, rating, comment, sleep_position, body_type) — karena skala kecil, tidak perlu halaman terpisah, cukup nested di form produk.

### 7.3 Validasi sisi frontend (mirror backend, bukan pengganti)
- Semua validasi yang sudah ada di backend (Fase 3.2, Fase 1.2) di-mirror di form ini supaya admin dapat feedback sebelum submit — tapi backend tetap jadi sumber kebenaran akhir (kalau frontend admin punya bug validasi, backend tetap menolak data yang salah).

### 7.4 Deliverable Fase 7
- [ ] Create, edit, delete produk berfungsi penuh dari admin panel, semua field ter-cover
- [ ] Upload & reorder gambar (lifestyle & texture terpisah) berfungsi
- [ ] Repeater variants & reviews berfungsi, termasuk set-default variant
- [ ] Percobaan submit tanpa texture image → diblokir di frontend (soft) dan ditolak di backend (hard, kalau somehow lolos frontend)

---

## Fase 8 — Admin Panel: Resource Quiz (Options & Mappings)

**Tujuan:** Antarmuka untuk kelola pertanyaan quiz dan mapping jawaban → produk, tanpa perlu edit database manual.

### 8.1 Resource "Quiz Options"
- List & form sederhana: `step_id`, `option_id`, `label`, `order_index`.
- Dikelompokkan per `step_id` di list view (grouped table) supaya admin bisa lihat semua opsi untuk satu step quiz sekaligus, bukan list datar tak terstruktur.

### 8.2 Resource "Quiz Mappings"
- Form: pilih kombinasi jawaban (dropdown per step, sesuai opsi dari 8.1), pilih produk hasil (dropdown dari resource Products), toggle `is_fallback`.
- **UI safeguard**: kalau admin coba uncheck `is_fallback` pada satu-satunya row fallback yang ada tanpa menandai row lain sebagai fallback, tampilkan warning sebelum submit ("Ini satu-satunya fallback quiz — pastikan ada pengganti sebelum menyimpan").
- List view menampilkan kombinasi jawaban dalam bentuk terbaca manusia (bukan mentah JSON), misal: "Menyamping + Soft + Pillow → [nama produk]".

### 8.3 Deliverable Fase 8
- [ ] Admin bisa tambah/edit/hapus quiz options tanpa sentuh database langsung
- [ ] Admin bisa atur mapping kombinasi jawaban → produk, termasuk fallback
- [ ] Warning fallback terakhir tampil sesuai skenario di 8.2

---

## Fase 9 — Migrasi Frontend Customer dari Data Statis ke Supabase

**Tujuan:** Frontend customer (`kumora-ux-migration` project) berhenti memakai `src/data/products.ts` statis, beralih fetch dari Supabase langsung (read-only, sesuai Fase 2).

> **Dependency:** fase ini baru bisa jalan setelah minimal beberapa produk nyata sudah dimasukkan lewat admin panel (Fase 7), supaya ada data untuk diuji.

### 9.1 Setup client Supabase di frontend customer
```
src/lib/supabaseClient.ts   # anon key, read-only
```

### 9.2 Ganti utilitas data
- `filterProducts(category)`, `getProductBySlug(slug)`, `getRelatedProducts()`, `getGiftSafeProducts()`, `matchQuizToProduct()` — semua diubah dari baca array statis jadi query Supabase (`select` dengan join ke `product_images`, `product_variants`, `product_reviews`).
- Tipe `Product` di frontend **tidak berubah bentuknya** — hanya sumber datanya yang berubah, supaya seluruh komponen PDP/Collection/Quiz dari implementation plan sebelumnya tidak perlu ditulis ulang, cukup layer data-fetching yang diganti.

### 9.3 Loading & error state
- Karena sekarang ada network request sungguhan (bukan data statis instan), tambahkan loading state wajar di Collection page dan PDP (skeleton sederhana, konsisten dengan animasi entrance yang sudah ada di Fase 8 implementation plan frontend).

### 9.4 Deliverable Fase 9
- [ ] Situs customer menampilkan data asli dari Supabase, bukan lagi array statis di kode
- [ ] Seluruh flow yang sudah diuji di implementation plan frontend (Fase 9 di dokumen itu) diuji ulang dengan data live
- [ ] `src/data/products.ts` statis lama dihapus atau diarsipkan sebagai seed data saja (tidak dipakai runtime lagi)

---

## Fase 10 — Deployment (Railway) & Testing Akhir

### 10.1 Deploy backend Express ke Railway
- Environment variables di Railway: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `PORT`. (`SUPABASE_PUBLISHABLE_KEY` dibutuhkan saat **build** admin panel, lihat 10.2 — bisa juga didaftarkan di Railway sebagai build-time env kalau build dijalankan di Railway.)
- Health-check endpoint (`GET /health`) dipakai Railway untuk monitoring uptime.

### 10.2 Build & serve admin panel dari Express (satu deployment, satu repo)
- Build step: `npm run build:admin` menghasilkan `admin/dist/`.
- `server/app.ts` menyajikan `admin/dist` sebagai static file di route `/admin`, dan API tetap di `/api/*` — satu proses Express, satu deployment Railway, tidak ada layanan hosting kedua.
- Admin panel **tidak** perlu domain/subdomain terpisah dan tidak perlu di-index (tambahkan `robots.txt: disallow` sederhana di response static), karena hanya dipakai 2 orang lewat `https://<domain-kamu>/admin`.

### 10.3 Testing akhir end-to-end
- [ ] Login admin panel di environment production
- [ ] Create 1 produk baru dari admin panel production → cek muncul di situs customer production
- [ ] Update harga/gambar produk → cek berubah di situs customer setelah refresh
- [ ] Hapus produk → cek hilang dari Collection & tidak lagi bisa diakses PDP-nya (404 wajar, bukan error mentah)
- [ ] Coba akses `/api/admin/*` tanpa token dari luar (curl/Postman) → 401, konfirmasi tidak ada celah bypass

### 10.4 Deliverable Fase 10
- [ ] Backend & admin panel live di Railway
- [ ] Seluruh skenario 10.3 lulus
- [ ] `DEPLOYMENT_NOTES.md` — cara re-deploy, cara tambah admin user baru, cara rollback migration kalau diperlukan

---

## Ringkasan Urutan Fase

| Fase | Fokus | Bisa diuji berdiri sendiri? |
|---|---|---|
| 0 | Setup project & koneksi Supabase | Tidak (fondasi) |
| 1 | Desain schema database | Ya, via Supabase Studio |
| 2 | RLS & kebijakan akses | Ya |
| 3 | Backend API — Products CRUD | Ya (Postman) |
| 4 | Backend API — Images, Variants, Reviews, Quiz | Ya (Postman) |
| 5 | Autentikasi admin | Ya |
| 6 | Admin panel — fondasi (layout, pola resource) | Ya |
| 7 | Admin panel — resource Products lengkap | Ya |
| 8 | Admin panel — resource Quiz | Ya |
| 9 | Migrasi frontend customer ke Supabase | Ya, dependency ke Fase 7 |
| 10 | Deployment Railway & testing akhir | End-to-end |

**Kunci keberhasilan strategi ini:** karena skala kecil (10-15 produk, 2 pengguna), godaan terbesar adalah "skip validasi karena toh cuma dipakai sendiri" — justru di sinilah risiko terbesar: kalau fallback quiz terhapus tanpa sadar, atau produk tanpa texture image ter-publish, dampaknya langsung terlihat di situs customer tanpa lapisan editorial lain yang menangkap kesalahan itu. Karena itu validasi bisnis di Fase 1.2/3.2/4.3 bukan sekadar "nice to have" meski timnya kecil — justru karena timnya kecil dan tidak ada proses review berlapis, validasi otomatis di backend menjadi satu-satunya jaring pengaman sebelum data salah tayang ke publik.
