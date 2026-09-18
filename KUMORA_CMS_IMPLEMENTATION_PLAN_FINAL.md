# Implementation Plan — CMS Homepage & About Kumora — FINAL
**Proyek:** Kumora (CMS Konten Homepage & About)
**Stack:** Express + TypeScript + Supabase (Postgres, Storage) + Admin panel React (bagian dari repo frontend, sesuai keputusan restrukturisasi arsitektur sebelumnya)
**Scope:** Menambahkan kemampuan CMS untuk seluruh konten Homepage (8 section) dan About (6 section) yang saat ini hardcoded di frontend, supaya bisa diedit lewat admin panel tanpa deploy ulang kode.
**Dependency:** Dokumen ini melanjutkan `KUMORA_BACKEND_ADMIN_IMPLEMENTATION_PLAN_FINAL.md` yang sudah selesai (Fase 0-10) dan restrukturisasi admin panel ke repo frontend yang sudah dilakukan. Tidak mengubah schema/endpoint Products, Variants, Reviews, Quiz yang sudah ada.

> **Keputusan yang mengunci scope dokumen ini:**
> 1. Konten section yang berbentuk **satu blok teks tetap** (hero, banner, teaser, dll) disimpan sebagai **tabel singleton** (selalu 1 row) — admin mengedit di tempat, bukan create/delete.
> 2. Konten section yang berbentuk **daftar berulang** (trust items, testimonials, milestones, values, mission items) disimpan sebagai tabel child dengan `order_index` — admin bisa tambah/hapus/reorder.
> 3. **Admin panel sidebar dikelompokkan jadi 2 grup besar**: **"Catalog"** (Products, Quiz Options, Quiz Mappings — sudah ada) dan **"CMS Konten"** (semua resource baru di dokumen ini, dikelompokkan lagi jadi sub-grup Homepage dan About). Ini murni penataan navigasi, tidak mengubah data/endpoint yang sudah ada.
> 4. Seluruh isi seed data mengikuti **persis** hasil analisis 14 gambar yang sudah divalidasi sebelumnya — tidak ada parafrase ulang, tidak ada konten baru yang dikarang.
> 5. Nomor WhatsApp di seluruh CTA memakai satu konstanta yang sama dengan yang sudah dipakai generator pesan WA di backend (`WHATSAPP_NUMBER`), bukan hardcode nomor terpisah di data CMS.
> 6. URL internal (`/shop/pillows`, `/quiz`, `/about`, dll) disimpan sebagai **path relatif**, bukan absolute URL dengan domain/localhost — supaya tetap valid saat pindah environment.

---

## 0. Prinsip Kerja

1. **Singleton pattern ditegakkan di level database, bukan cuma konvensi aplikasi.** Constraint `id int primary key default 1 check (id = 1)` di setiap tabel section-tunggal memastikan tidak ada baris kedua yang bisa masuk secara tidak sengaja — ini pengaman teknis, bukan cuma aturan yang diharapkan diikuti developer.
2. **Seed data adalah kontrak, bukan draf.** Isi teks yang sudah dianalisis dari 14 gambar (hook, title, subtitle, deskripsi, dst) dimasukkan **verbatim** ke seed script — siapapun yang menjalankan Fase 4 tidak boleh mengubah kalimat "supaya lebih enak dibaca" tanpa sepengetahuan pemilik produk, karena itu representasi teks yang sudah live di situs.
3. **Gambar adalah pengecualian eksplisit dari kontrak di atas.** Semua field `*_image_url` di seed data diisi `NULL`/placeholder secara sengaja di tahap seeding awal, lalu diisi terpisah lewat proses pencarian/upload gambar (lihat Fase 4.3) — jangan sampai proses ini terlewat dan section tampil tanpa gambar di production.
4. **Admin panel resource untuk singleton section BEDA pola UI-nya dari resource biasa.** Resource biasa (Products) punya List → Form → Delete. Resource singleton (Hero, Banner, dst) **tidak** punya List view maupun Delete — begitu masuk menu section itu, admin langsung disodori form edit dari 1 row yang sudah pasti ada (dari hasil seeding). Ini pola baru yang perlu ditambahkan di komponen admin panel generik, bukan dipaksakan pakai `ResourceTable` yang sudah ada untuk resource list.
5. **Frontend customer harus 100% pindah ke data dinamis, tidak ada sisa hardcoded text.** Setelah Fase 6, tidak boleh ada satu pun string konten section (hook, title, subtitle, item repeater) yang masih tertulis langsung di kode komponen React — kalau ketemu, itu bug yang harus diperbaiki sebelum fase dianggap selesai.
6. **Non-destruktif terhadap CMS Products/Quiz yang sudah ada.** Restrukturisasi navigasi admin panel di Fase 5 murni soal pengelompokan sidebar, endpoint dan resource Products/Quiz yang sudah berfungsi tidak disentuh strukturnya.

---

## Fase 1 — Migration Schema Database CMS

**Tujuan:** Menambahkan seluruh tabel CMS (19 tabel: 8 section homepage + child table-nya, 6 section about + child table-nya, plus `category_content`) lewat migration file baru, tanpa menyentuh tabel existing.

### 1.1 File migration
```
supabase/migrations/0002_cms_content.sql
```

### 1.2 Skema lengkap — Homepage

```sql
-- ============ HOMEPAGE ============

create table home_hero (
  id int primary key default 1 check (id = 1),
  hook text not null,
  title text not null,
  subtitle text not null,
  background_image_url text,
  cta_1_text text not null,
  cta_1_url text not null,
  cta_2_text text not null,
  cta_2_url text not null,
  updated_at timestamptz default now()
);

create table home_showcase_section (
  id int primary key default 1 check (id = 1),
  eyebrow text not null,
  title text not null,
  subtitle text not null,
  updated_at timestamptz default now()
);

create table home_showcase_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  order_index int default 0
);

create table home_philosophy_teaser (
  id int primary key default 1 check (id = 1),
  eyebrow text not null,
  title text not null,
  paragraph_1 text not null,
  paragraph_2 text not null,
  link_text text not null,
  link_url text not null,
  image_url text,
  updated_at timestamptz default now()
);

create table home_trust_section (
  id int primary key default 1 check (id = 1),
  eyebrow text not null,
  title text not null,
  updated_at timestamptz default now()
);

create table home_trust_items (
  id uuid primary key default gen_random_uuid(),
  icon_name text not null,
  title text not null,
  description text not null,
  order_index int default 0
);

create table home_category_section (
  id int primary key default 1 check (id = 1),
  eyebrow text not null,
  title text not null,
  updated_at timestamptz default now()
);

create table category_content (
  category text primary key check (category in ('pillows', 'bolsters', 'beds')),
  display_name text not null,
  description text not null,
  tile_image_url text,
  link_text text not null default 'Lihat'
);

create table home_banner (
  id int primary key default 1 check (id = 1),
  title text not null,
  subtitle text not null,
  background_image_url text,
  updated_at timestamptz default now()
);

create table home_testimonials_section (
  id int primary key default 1 check (id = 1),
  eyebrow text not null,
  title text not null,
  updated_at timestamptz default now()
);

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_location text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  order_index int default 0,
  is_published boolean default true
);

create table home_final_cta (
  id int primary key default 1 check (id = 1),
  title text not null,
  subtitle text not null,
  cta_1_text text not null,
  cta_1_url text not null,
  cta_2_text text not null,
  cta_2_url text not null,
  cta_3_text text not null,
  cta_3_url text not null,
  updated_at timestamptz default now()
);
```

### 1.3 Skema lengkap — About

```sql
-- ============ ABOUT ============

create table about_hero (
  id int primary key default 1 check (id = 1),
  eyebrow text not null,
  title text not null,
  subtitle text not null,
  background_image_url text,
  updated_at timestamptz default now()
);

create table about_story (
  id int primary key default 1 check (id = 1),
  title text not null,
  paragraph_1 text not null,
  paragraph_2 text not null,
  image_url text,
  updated_at timestamptz default now()
);

create table about_milestones_section (
  id int primary key default 1 check (id = 1),
  eyebrow text not null,
  title text not null,
  updated_at timestamptz default now()
);

create table about_milestones (
  id uuid primary key default gen_random_uuid(),
  counter_number int not null,
  year int not null,
  title text not null,
  description text not null,
  order_index int default 0
);

create table about_vision_mission (
  id int primary key default 1 check (id = 1),
  vision_label text not null default 'VISI',
  vision_text text not null,
  mission_label text not null default 'MISI',
  updated_at timestamptz default now()
);

create table about_mission_items (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  order_index int default 0
);

create table about_values_section (
  id int primary key default 1 check (id = 1),
  eyebrow text not null,
  title text not null,
  updated_at timestamptz default now()
);

create table about_values (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  order_index int default 0
);

create table about_final_cta (
  id int primary key default 1 check (id = 1),
  title text not null,
  subtitle text not null,
  cta_text text not null,
  cta_url text not null,
  updated_at timestamptz default now()
);
```

### 1.4 Deliverable Fase 1
- [ ] Migration `0002_cms_content.sql` dijalankan lewat Supabase CLI, 19 tabel baru terverifikasi ada di Supabase Studio
- [ ] Percobaan `insert` baris ke-2 ke salah satu tabel singleton (mis. `home_hero`) — **harus ditolak** oleh constraint `check (id = 1)`, jadi wajib insert dengan `on conflict (id) do update` untuk update, bukan `insert` biasa berulang
- [ ] Tidak ada tabel existing (products, variants, reviews, quiz_*) yang berubah struktur

---

## Fase 2 — RLS untuk Tabel CMS

**Tujuan:** Konsisten dengan pola keamanan yang sudah ditetapkan — public read, write hanya lewat backend dengan Secret key.

### 2.1 Aktifkan RLS & policy public read di seluruh 19 tabel
```sql
-- Ulangi pola ini untuk SEMUA tabel di Fase 1.2 dan 1.3:
alter table home_hero enable row level security;
create policy "public_read_home_hero" on home_hero for select using (true);

alter table home_showcase_section enable row level security;
create policy "public_read_home_showcase_section" on home_showcase_section for select using (true);

alter table home_showcase_products enable row level security;
create policy "public_read_home_showcase_products" on home_showcase_products for select using (true);

alter table home_philosophy_teaser enable row level security;
create policy "public_read_home_philosophy_teaser" on home_philosophy_teaser for select using (true);

alter table home_trust_section enable row level security;
create policy "public_read_home_trust_section" on home_trust_section for select using (true);

alter table home_trust_items enable row level security;
create policy "public_read_home_trust_items" on home_trust_items for select using (true);

alter table home_category_section enable row level security;
create policy "public_read_home_category_section" on home_category_section for select using (true);

alter table category_content enable row level security;
create policy "public_read_category_content" on category_content for select using (true);

alter table home_banner enable row level security;
create policy "public_read_home_banner" on home_banner for select using (true);

alter table home_testimonials_section enable row level security;
create policy "public_read_home_testimonials_section" on home_testimonials_section for select using (true);

alter table testimonials enable row level security;
create policy "public_read_testimonials" on testimonials for select using (is_published = true);

alter table home_final_cta enable row level security;
create policy "public_read_home_final_cta" on home_final_cta for select using (true);

alter table about_hero enable row level security;
create policy "public_read_about_hero" on about_hero for select using (true);

alter table about_story enable row level security;
create policy "public_read_about_story" on about_story for select using (true);

alter table about_milestones_section enable row level security;
create policy "public_read_about_milestones_section" on about_milestones_section for select using (true);

alter table about_milestones enable row level security;
create policy "public_read_about_milestones" on about_milestones for select using (true);

alter table about_vision_mission enable row level security;
create policy "public_read_about_vision_mission" on about_vision_mission for select using (true);

alter table about_mission_items enable row level security;
create policy "public_read_about_mission_items" on about_mission_items for select using (true);

alter table about_values_section enable row level security;
create policy "public_read_about_values_section" on about_values_section for select using (true);

alter table about_values enable row level security;
create policy "public_read_about_values" on about_values for select using (true);

alter table about_final_cta enable row level security;
create policy "public_read_about_final_cta" on about_final_cta for select using (true);
```

> **Catatan khusus `testimonials`:** policy public read **hanya** mengizinkan baris dengan `is_published = true` — ini beda dari tabel lain yang `using (true)` polos, karena field `is_published` memang didesain supaya admin bisa "sembunyikan" testimoni tanpa menghapusnya permanen (misal testimoni lama yang mau diarsipkan tapi tidak dihapus dari database).

### 2.2 Deliverable Fase 2
- [ ] Seluruh 19 tabel RLS aktif, public read jalan, public write ditolak (uji sama seperti Fase 2.3 di plan backend sebelumnya)
- [ ] Testimoni dengan `is_published = false` **tidak muncul** saat query pakai Publishable key, tapi tetap muncul saat query pakai Secret key (dari admin panel)
- [ ] Update `RLS_POLICY_NOTES.md` dengan daftar 19 tabel baru ini

---

## Fase 3 — Backend API: Endpoint CMS

**Tujuan:** Endpoint CRUD untuk seluruh resource CMS, mengikuti pola response envelope yang sudah ada, dibedakan jelas antara endpoint singleton vs endpoint list.

### 3.1 Pola endpoint singleton (dipakai 14 tabel: semua yang punya `id int default 1`)
```
GET  /api/admin/cms/home-hero
PUT  /api/admin/cms/home-hero          # selalu update row id=1, upsert kalau somehow belum ada
```
Pola yang sama diulang untuk: `home-showcase-section`, `home-philosophy-teaser`, `home-trust-section`, `home-category-section`, `home-banner`, `home-testimonials-section`, `home-final-cta`, `about-hero`, `about-story`, `about-milestones-section`, `about-vision-mission`, `about-values-section`, `about-final-cta`.

- Handler `PUT` di backend memakai `upsert` Supabase (`.upsert({ id: 1, ...body })`) — bukan `update` biasa, supaya tetap aman kalau baris singleton belum sempat ke-seed di environment tertentu.

### 3.2 Pola endpoint list/child (dipakai 6 tabel repeater: `home_showcase_products`, `home_trust_items`, `category_content`, `testimonials`, `about_milestones`, `about_mission_items`, `about_values`)
```
GET    /api/admin/cms/trust-items
POST   /api/admin/cms/trust-items
PATCH  /api/admin/cms/trust-items/:id
DELETE /api/admin/cms/trust-items/:id
PATCH  /api/admin/cms/trust-items/reorder     # body: [{id, order_index}, ...], update batch
```
Pola yang sama untuk: `showcase-products`, `testimonials`, `milestones`, `mission-items`, `values`.

`category_content` **sedikit beda** — bukan create/delete (selalu tepat 3 row: pillows/bolsters/beds), cukup:
```
GET   /api/admin/cms/category-content
PATCH /api/admin/cms/category-content/:category   # :category = pillows|bolsters|beds
```

### 3.3 Endpoint publik (dipakai frontend customer, read-only, TANPA auth middleware)
- Karena semua tabel sudah public-read via RLS, **frontend customer tidak perlu lewat backend Express sama sekali** untuk baca konten CMS ini — langsung query Supabase (konsisten dengan prinsip di plan backend sebelumnya: read jalur langsung, write jalur backend). Jadi **tidak perlu** dibuatkan endpoint publik terpisah di Express untuk CMS ini.

### 3.4 Validasi khusus
- Endpoint `PUT /api/admin/cms/home-hero` dan section CTA lainnya: validasi `cta_*_url` tidak boleh string kosong, dan kalau formatnya bukan path relatif (`/...`) atau bukan URL `https://wa.me/...`/`http://` lengkap, tolak dengan pesan jelas — mencegah admin tidak sengaja simpan URL rusak yang bikin tombol CTA di situs customer error.
- Endpoint reorder: pastikan payload `order_index` tidak ada duplikat dalam satu request (dua item tidak boleh punya `order_index` sama setelah reorder).

### 3.5 Deliverable Fase 3
- [ ] Seluruh endpoint singleton & list CMS berfungsi, diuji lewat Postman collection baru (`docs/postman/cms-admin.json`)
- [ ] Upsert singleton diuji: panggil `PUT` dua kali berturut-turut dengan data berbeda — hasil akhir cuma 1 row dengan data terbaru, bukan 2 row
- [ ] Reorder testimoni/trust-items/milestones/values diuji mengubah urutan dan tersimpan benar

---

## Fase 4 — Seeding Data (Verbatim dari Hasil Analisis 14 Gambar)

**Tujuan:** Mengisi seluruh 19 tabel dengan data asli, persis seperti hasil analisis gambar sebelumnya, tanpa parafrase.

### 4.1 File seed
```
supabase/seed/0002_cms_content_seed.sql
```

### 4.2 Seed lengkap

```sql
-- ============ HOMEPAGE SEED ============

insert into home_hero (id, hook, title, subtitle, background_image_url, cta_1_text, cta_1_url, cta_2_text, cta_2_url)
values (
  1,
  'Seni Istirahat yang Lebih Baik',
  'Tidur Lebih Nyenyak. Hidup Lebih Baik.',
  'Kumora menghadirkan perlengkapan tidur dan kamar yang dirancang dengan penuh perhatian untuk kenyamanan yang lebih baik setiap hari.',
  null, -- TODO: gambar dicari terpisah, lihat 4.3
  'Lihat Produk',
  '/shop/pillows',
  'Hubungi Kami',
  'https://wa.me/' || current_setting('app.whatsapp_number', true) || '?text=Hi%20Kumora!%20I%27m%20interested%20in%20the%20Kumora%20products%20%E2%80%93%20general%20inquiry.%20Could%20you%20help%20me%20with%20the%20order%3F'
)
on conflict (id) do update set
  hook = excluded.hook, title = excluded.title, subtitle = excluded.subtitle,
  cta_1_text = excluded.cta_1_text, cta_1_url = excluded.cta_1_url,
  cta_2_text = excluded.cta_2_text, cta_2_url = excluded.cta_2_url;

insert into home_showcase_section (id, eyebrow, title, subtitle) values (
  1, 'KOLEKSI KAMI', 'Kenyamanan yang Dipilih untuk Anda',
  'Temukan perlengkapan sehari-hari yang dirancang untuk menjadikan kamar Anda lebih nyaman.'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title, subtitle = excluded.subtitle;

-- home_showcase_products: diisi via seed script terpisah SETELAH data products ter-seed (Fase 4.4),
-- karena butuh product_id nyata dari tabel products, bukan bisa hardcode di sini.

insert into home_philosophy_teaser (id, eyebrow, title, paragraph_1, paragraph_2, link_text, link_url, image_url) values (
  1, 'FILOSOFI KAMI', 'Dibuat untuk Istirahat yang Nyata',
  'Kumora lahir dari pemahaman sederhana: istirahat berkualitas membutuhkan perlengkapan yang benar-benar bekerja untuk tubuh Anda. Kami tidak percaya pada klaim berlebihan — kami fokus pada bahan terbaik, konstruksi yang teliti, dan kenyamanan yang konsisten setiap malam.',
  'Setiap produk kami uji langsung dalam kehidupan sehari-hari, memastikan setiap serat dan lapisan memberikan kenyamanan yang Anda rasakan sejak pemakaian pertama.',
  'Kenali Kisah Kami', '/about', null
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title,
  paragraph_1 = excluded.paragraph_1, paragraph_2 = excluded.paragraph_2,
  link_text = excluded.link_text, link_url = excluded.link_url;

insert into home_trust_section (id, eyebrow, title) values (
  1, 'MENGAPA KUMORA', 'Dibuat dengan Kenyamanan sebagai Dasar'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into home_trust_items (icon_name, title, description, order_index) values
  ('layers', 'Bahan Terpilih', 'Kami memilih bahan dengan perhatian pada kenyamanan dan daya tahan sehari-hari.', 0),
  ('heart', 'Kenyamanan Sehari-hari', 'Produk kami dirancang untuk mendukung istirahat yang lebih baik tanpa mengorbankan kegunaan.', 1),
  ('sparkles', 'Kualitas yang Terasa', 'Kami memperhatikan bahan, konstruksi, dan detail yang membuat produk sehari-hari lebih baik.', 2),
  ('headphones', 'Layanan Personal', 'Tim kami siap melayani lewat WhatsApp untuk membantu pelanggan menemukan produk yang tepat.', 3);

insert into home_category_section (id, eyebrow, title) values (
  1, 'PILIH BERDASARKAN KATEGORI', 'Temukan Kenyamanan Anda'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into category_content (category, display_name, description, tile_image_url, link_text) values
  ('pillows', 'Pillows', 'Kenyamanan yang menopang untuk setiap gaya tidur.', null, 'Lihat'),
  ('bolsters', 'Bolsters', 'Dukungan seimbang untuk posisi tidur yang lebih lurus.', null, 'Lihat'),
  ('beds', 'Beds', 'Dukungan seimbang untuk malam yang lebih nyenyak.', null, 'Lihat')
on conflict (category) do update set display_name = excluded.display_name,
  description = excluded.description, link_text = excluded.link_text;

insert into home_banner (id, title, subtitle, background_image_url) values (
  1, 'Istirahat Anda Berarti.', 'Karena hari yang lebih baik dimulai dari malam yang lebih nyenyak.', null
) on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle;

insert into home_testimonials_section (id, eyebrow, title) values (
  1, 'TESTIMONI', 'Disukai Mereka yang Tidurnya Lebih Nyenyak'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into testimonials (author_name, author_location, rating, comment, order_index, is_published) values
  ('Andi Pratama', 'Bandung', 5, 'Bantal Cloud terasa lembut tanpa kehilangan dukungan yang saya butuhkan. Saya tidur jauh lebih nyaman sekarang.', 0, true),
  ('Nadia Putri', 'Jakarta', 5, 'Saya suka betapa sederhana tampilan Seprai Signature. Bahannya juga terasa jauh lebih premium dari yang saya kira.', 1, true),
  ('Rizky Mahendra', 'Bekasi', 5, 'Tim Kumora membantu saya memilih kasur berdasarkan gaya tidur saya, bukan sekadar merekomendasikan yang paling mahal.', 2, true);

insert into home_final_cta (id, title, subtitle, cta_1_text, cta_1_url, cta_2_text, cta_2_url, cta_3_text, cta_3_url) values (
  1,
  'Siap Menemukan Kenyamanan Anda?',
  'Jelajahi koleksi Kumora atau bicara langsung dengan tim kami untuk menemukan produk yang tepat untuk Anda.',
  'Lihat Produk', '/shop/pillows',
  'Belum tahu yang cocok? Temukan pilihan Anda', '/quiz',
  'Chat melalui WhatsApp',
  'https://wa.me/' || current_setting('app.whatsapp_number', true) || '?text=Hi%20Kumora!%20I%27m%20interested%20in%20the%20Kumora%20products%20%E2%80%93%20general%20inquiry.%20Could%20you%20help%20me%20with%20the%20order%3F'
) on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle,
  cta_1_text = excluded.cta_1_text, cta_1_url = excluded.cta_1_url,
  cta_2_text = excluded.cta_2_text, cta_2_url = excluded.cta_2_url,
  cta_3_text = excluded.cta_3_text, cta_3_url = excluded.cta_3_url;

-- ============ ABOUT SEED ============

insert into about_hero (id, eyebrow, title, subtitle, background_image_url) values (
  1, 'Kisah Kami', 'Dirancang untuk Istirahat yang Lebih Baik.',
  'Kumora adalah merek perlengkapan tidur dan kamar yang berfokus pada membuat kenyamanan sehari-hari terasa lebih penuh perhatian, mudah dijangkau, dan personal.',
  null
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title, subtitle = excluded.subtitle;

insert into about_story (id, title, paragraph_1, paragraph_2, image_url) values (
  1, 'Satu Gagasan Sederhana: Istirahat Lebih Baik untuk Keseharian',
  'Kumora didirikan pada tahun 2015 dengan gagasan sederhana: setiap orang berhak atas tempat istirahat yang nyaman. Apa yang dimulai sebagai koleksi kecil bantal sehari-hari perlahan berkembang menjadi rangkaian perlengkapan kamar yang lebih luas.',
  'Saat ini, Kumora menggabungkan bantal, kasur, seprai, dan aksesori kamar dalam satu merek, sambil tetap berpegang pada prinsip awal: menjadikan istirahat sehari-hari lebih baik.',
  null
) on conflict (id) do update set title = excluded.title, paragraph_1 = excluded.paragraph_1, paragraph_2 = excluded.paragraph_2;

insert into about_milestones_section (id, eyebrow, title) values (
  1, 'PERJALANAN KAMI', 'Pencapaian'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into about_milestones (counter_number, year, title, description, order_index) values
  (15, 2015, 'Kumora Didirikan', 'Kumora memulai perjalanan dengan koleksi perlengkapan tidur sehari-hari pertamanya.', 0),
  (18, 2018, 'Koleksi Bantal Pertama', 'Merek memperluas lini bantal dengan beberapa profil kenyamanan.', 1),
  (21, 2021, 'Memasuki Kamar Tidur', 'Kumora meluncurkan produk kasur dan perlengkapan tidur.', 2),
  (24, 2024, 'Koleksi Kamar Lengkap', 'Portofolio produk berkembang menjadi koleksi perlengkapan kamar yang lengkap.', 3),
  (26, 2026, 'Tumbuh Bersama Anda', 'Kumora mulai memperluas kehadiran digital dan pengalaman pelanggan.', 4);

insert into about_vision_mission (id, vision_label, vision_text, mission_label) values (
  1, 'VISI', 'Menjadi nama terpercaya dalam kenyamanan tidur dan kamar sehari-hari.', 'MISI'
) on conflict (id) do update set vision_text = excluded.vision_text;

insert into about_mission_items (text, order_index) values
  ('Menciptakan produk tidur yang nyaman dan dapat diandalkan.', 0),
  ('Terus meningkatkan bahan dan desain produk.', 1),
  ('Memberikan pengalaman pelanggan yang mudah dan personal.', 2),
  ('Membangun hubungan jangka panjang dengan pelanggan.', 3);

insert into about_values_section (id, eyebrow, title) values (
  1, 'YANG KAMI PEGANG', 'Nilai Utama'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into about_values (title, description, order_index) values
  ('KENYAMANAN', 'Kenyamanan adalah fondasi dari semua yang kami ciptakan.', 0),
  ('KUALITAS', 'Kami memperhatikan bahan, konstruksi, dan detail di balik setiap produk.', 1),
  ('KEPEDULIAN', 'Kami mendengarkan pelanggan dan merancang berdasarkan kebutuhan sehari-hari yang nyata.', 2),
  ('PERTUMBUHAN', 'Kami terus berkembang seiring perubahan gaya hidup, ekspektasi, dan teknologi.', 3);

insert into about_final_cta (id, title, subtitle, cta_text, cta_url) values (
  1, 'Jelajahi Koleksi Kumora', 'Temukan perlengkapan tidur dan kamar yang dirancang dengan penuh perhatian.',
  'Lihat Produk', '/shop/pillows'
) on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle, cta_text = excluded.cta_text;
```

> **Catatan implementasi `WHATSAPP_NUMBER` di seed SQL:** `current_setting('app.whatsapp_number', true)` di atas adalah placeholder teknik — SQL murni tidak baca `.env` aplikasi. Cara paling aman: seed script dijalankan **lewat kode backend** (script Node.js/TypeScript yang import konstanta `WHATSAPP_NUMBER` yang sama dengan generator WA, lalu build query insert dengan nilai itu ter-interpolasi), bukan dieksekusi sebagai file `.sql` mentah lewat CLI. Ini juga sekalian menyelesaikan poin 4.4 di bawah (butuh `product_id` dinamis).

### 4.3 Pengisian gambar (`background_image_url`, `image_url`, `tile_image_url`)
- Semua field ini di-seed sebagai `null` terlebih dulu (lihat SQL di atas).
- Cari/generate gambar pengganti sesuai deskripsi visual yang sudah ditentukan di analisis sebelumnya:

| Field | Deskripsi visual yang harus dicari |
|---|---|
| `home_hero.background_image_url` | Foto kamar tidur bernuansa hangat/dim, gorden, headboard |
| `home_philosophy_teaser.image_url` | Foto kamar tidur bernuansa netral/beige, sudut kamar dengan nakas |
| `category_content.tile_image_url` (pillows) | Foto bantal putih berantakan di atas kasur |
| `category_content.tile_image_url` (bolsters) | Foto guling coklat & motif garis |
| `category_content.tile_image_url` (beds) | Foto kasur/bed frame gelap dengan bantal |
| `home_banner.background_image_url` | Siluet tempat tidur menghadap jendela, cahaya pagi keemasan |
| `about_hero.background_image_url` | Headboard beludru abu-abu dengan bantal orange & putih, close-up |
| `about_story.image_url` | Kamar tidur mewah bernuansa gold/marble, kasur coklat |

- Upload hasilnya ke Supabase Storage bucket yang sama dengan gambar produk (`product-images`, atau buat bucket baru `cms-images` supaya terpisah rapi — direkomendasikan bucket terpisah karena siklus hidup asetnya beda dari gambar produk), lalu `UPDATE` row terkait dengan URL hasil upload.

### 4.4 Seed `home_showcase_products` (bergantung pada data produk sudah ada)
Setelah 10-15 produk sudah ter-seed di tabel `products` (dari implementation plan backend sebelumnya), jalankan insert berikut dengan `product_id` diambil dari `slug`:

```sql
insert into home_showcase_products (product_id, order_index)
select id, 0 from products where slug = 'kumora-bantal-cloud'
union all
select id, 1 from products where slug = 'kumora-bantal-align'
union all
select id, 2 from products where slug = 'kumora-bantal-breeze'
union all
select id, 3 from products where slug = 'kumora-guling-comfort';
```
> Sesuaikan `slug` di atas dengan slug asli yang dipakai saat seeding produk di Fase 9 plan backend sebelumnya — kalau penamaan slug berbeda dari asumsi di sini, ganti manual sebelum dijalankan.

### 4.5 Verifikasi konten silang (dari catatan analisis sebelumnya)
- [ ] Cek testimoni #2 ("Seprai Signature") dan #3 (produk kategori kasur) terhadap katalog 10-15 produk final — kalau produk yang disebut testimoni ini memang tidak ada di katalog, laporkan ke pemilik bisnis untuk keputusan: edit teks testimoni, atau tambahkan produk itu ke katalog.

### 4.6 Deliverable Fase 4
- [ ] Seluruh 19 tabel + `home_showcase_products` terisi data verbatim sesuai SQL di atas
- [ ] Seed dijalankan via script Node/TS (bukan file `.sql` mentah) supaya `WHATSAPP_NUMBER` dan `product_id` ter-resolve dinamis dengan benar
- [ ] Seluruh gambar dari tabel 4.3 sudah terisi URL asli (bukan lagi `null`) sebelum lanjut ke Fase 6
- [ ] Hasil verifikasi 4.5 dilaporkan

---

## Fase 5 — Admin Panel: Restrukturisasi Navigasi (Catalog vs CMS)

**Tujuan:** Mengelompokkan sidebar admin panel jadi 2 grup besar, tanpa mengubah resource Products/Quiz yang sudah ada.

### 5.1 Struktur sidebar baru
```
Sidebar
├── CATALOG
│   ├── Products
│   ├── Quiz Options
│   └── Quiz Mappings
└── CMS KONTEN
    ├── Homepage
    │   ├── Hero
    │   ├── Showcase Produk
    │   ├── Filosofi (Teaser)
    │   ├── Trust Strip
    │   ├── Kategori (Tiles)
    │   ├── Banner
    │   ├── Testimoni
    │   └── CTA Akhir
    └── About
        ├── Hero
        ├── Brand Story
        ├── Milestones
        ├── Visi & Misi
        ├── Nilai Utama
        └── CTA Akhir
```

### 5.2 Update `AdminLayout.tsx`
- Sidebar jadi accordion 2 level: grup utama (Catalog / CMS Konten) bisa collapse/expand, di dalam CMS Konten ada sub-grup Homepage dan About yang juga collapsible.
- Item aktif tetap dapat highlight visual sesuai pola yang sudah ada (Fase 6.3 di plan backend sebelumnya), disesuaikan agar bekerja di struktur nested ini.

### 5.3 Registrasi resource config
Tambahkan config baru di `admin/src/resources/cms/` mengikuti pola `ResourceConfig` yang sudah ada, tapi dengan flag baru:
```typescript
interface ResourceConfig<T> {
  name: string;
  endpoint: string;
  mode: "list" | "singleton";   // BARU — menentukan UI yang dipakai
  columns?: { key: keyof T; label: string }[];   // hanya dipakai kalau mode "list"
  formFields: FormFieldConfig[];
}
```
- `mode: "singleton"` → route langsung ke form edit (skip List view), memakai komponen baru `SingletonResourceForm` (variasi dari `ResourceForm` yang sudah ada, tanpa tombol "Tambah Baru"/"Hapus").
- `mode: "list"` → tetap pakai `ResourceTable` + `ResourceForm` seperti Products.

### 5.4 Deliverable Fase 5
- [ ] Sidebar tampil 2 grup (Catalog, CMS Konten) dengan sub-grup Homepage/About di dalam CMS Konten
- [ ] Resource Products/Quiz Options/Quiz Mappings tetap berfungsi identik seperti sebelumnya (regresi nol)
- [ ] `SingletonResourceForm` siap dipakai untuk 14 resource singleton di Fase 6

---

## Fase 6 — Admin Panel: Form per Resource CMS

**Tujuan:** Membangun form edit untuk seluruh 14 resource singleton dan 6 resource list/repeater.

### 6.1 Resource singleton (14 buah) — pola form seragam
Setiap resource singleton punya form dengan field sesuai kolom tabelnya (lihat Fase 1.2/1.3). Contoh konkret untuk `Home Hero`:
```typescript
{
  name: "Home Hero",
  endpoint: "/api/admin/cms/home-hero",
  mode: "singleton",
  formFields: [
    { key: "hook", label: "Hook (eyebrow text)", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "subtitle", label: "Subtitle", type: "textarea" },
    { key: "background_image_url", label: "Background Image", type: "image-upload" },
    { key: "cta_1_text", label: "CTA 1 — Text", type: "text" },
    { key: "cta_1_url", label: "CTA 1 — URL", type: "text" },
    { key: "cta_2_text", label: "CTA 2 — Text", type: "text" },
    { key: "cta_2_url", label: "CTA 2 — URL", type: "text" },
  ],
}
```
Ulangi pola yang sama untuk 13 resource singleton lainnya sesuai field masing-masing tabel di Fase 1.

### 6.2 Resource list/repeater (6 buah)
- **Trust Items, Milestones, Values, Mission Items**: `ResourceTable` sederhana dengan drag-to-reorder (memanggil endpoint `/reorder` dari Fase 3.2).
- **Testimonials**: `ResourceTable` + toggle kolom `is_published` langsung di tabel (tanpa perlu buka form) untuk memudahkan admin "sembunyikan" testimoni dengan cepat.
- **Showcase Products**: bentuknya beda dari repeater teks biasa — form pilih produk dari dropdown (search-as-you-type dari resource Products yang sudah ada), lalu drag-to-reorder untuk urutan tampil di homepage. Maksimal ditampilkan sesuai jumlah yang mau ditentukan admin (tidak dihardcode 4, biar fleksibel).

### 6.3 Kasus khusus: `category_content`
- Bukan singleton murni (3 row tetap: pillows/bolsters/beds), bukan juga list/repeater biasa (tidak bisa tambah/hapus row). UI: tab atau 3 card berdampingan, masing-masing punya form edit sendiri (display_name, description, tile_image_url, link_text) — tidak ada tombol "Tambah Kategori" karena kategori memang dikunci di 3 itu (konsisten dengan constraint di frontend Fase 0.2 plan migrasi UX).

### 6.4 Deliverable Fase 6
- [ ] Seluruh 14 resource singleton bisa diedit dan tersimpan lewat admin panel, hasilnya termuat di database (verifikasi lewat Supabase Studio)
- [ ] 6 resource list/repeater bisa tambah/edit/hapus/reorder
- [ ] `category_content` menampilkan tepat 3 kategori, tidak ada opsi tambah/hapus kategori baru
- [ ] Upload gambar dari admin panel untuk field `*_image_url` berfungsi (reuse `ImageUploader` dari plan backend sebelumnya)

---

## Fase 7 — Migrasi Frontend Customer: Homepage & About dari Hardcoded ke Dinamis

**Tujuan:** Seluruh komponen Homepage dan About di frontend customer membaca dari Supabase, bukan lagi teks statis di kode.

### 7.1 Utilitas fetch baru
```typescript
// src/lib/cms.ts
export async function getHomeHero(): Promise<HomeHero> { /* select dari home_hero, single() */ }
export async function getHomeShowcase(): Promise<{ section: HomeShowcaseSection; products: Product[] }> { /* join home_showcase_products -> products, order by order_index */ }
export async function getHomePhilosophyTeaser(): Promise<HomePhilosophyTeaser> { /* ... */ }
export async function getHomeTrust(): Promise<{ section: HomeTrustSection; items: TrustItem[] }> { /* ... */ }
export async function getCategoryTiles(): Promise<{ section: HomeCategorySection; categories: CategoryContent[] }> { /* ... */ }
export async function getHomeBanner(): Promise<HomeBanner> { /* ... */ }
export async function getTestimonials(): Promise<{ section: HomeTestimonialsSection; items: Testimonial[] }> { /* filter is_published implisit lewat RLS */ }
export async function getHomeFinalCta(): Promise<HomeFinalCta> { /* ... */ }

export async function getAboutHero(): Promise<AboutHero> { /* ... */ }
export async function getAboutStory(): Promise<AboutStory> { /* ... */ }
export async function getAboutMilestones(): Promise<{ section: AboutMilestonesSection; items: Milestone[] }> { /* ... */ }
export async function getAboutVisionMission(): Promise<{ vm: AboutVisionMission; missionItems: MissionItem[] }> { /* ... */ }
export async function getAboutValues(): Promise<{ section: AboutValuesSection; items: AboutValue[] }> { /* ... */ }
export async function getAboutFinalCta(): Promise<AboutFinalCta> { /* ... */ }
```

### 7.2 Update komponen Homepage & About
- Setiap section component (`HeroSection.tsx`, `ShowcaseSection.tsx`, dst) diganti dari menerima teks hardcoded jadi menerima props dari hasil fetch di atas, atau fetch langsung di dalam komponennya dengan loading state.
- **Tidak boleh** ada satu pun string konten yang tersisa hardcoded — audit manual tiap komponen sebelum fase dianggap selesai.
- CTA button (`cta_1_url`, dst) dipakai langsung sebagai `href`/`to` — kalau path relatif (`/shop/pillows`) pakai React Router `Link`, kalau full URL (`https://wa.me/...`) pakai anchor `<a target="_blank">`.

### 7.3 Loading & error state
- Karena section sekarang fetch data, tambahkan skeleton loading sederhana per section (konsisten dengan pola yang sudah diterapkan untuk Collection/PDP di plan migrasi UX Fase 9.3) — jangan biarkan section kosong/blank saat data belum load.

### 7.4 Deliverable Fase 7
- [ ] Homepage dan About tampil 100% dari data Supabase, tidak ada teks hardcoded tersisa (audit `grep` string dari seed data di 7.5 untuk memastikan tidak ada duplikat di source kode React)
- [ ] Loading state wajar di semua section
- [ ] Semua CTA (internal path & WA link) berfungsi mengarah ke tujuan yang benar

### 7.5 Audit anti-hardcode
```bash
grep -r "Tidur Lebih Nyenyak" src/          # harus 0 hasil di file komponen (boleh ada di seed/migration saja)
grep -r "Seni Istirahat yang Lebih Baik" src/
grep -r "Dibuat untuk Istirahat yang Nyata" src/
# ... ulangi untuk string kunci lain dari tiap section
```

---

## Fase 8 — Testing Akhir End-to-End

### 8.1 Skenario testing
- [ ] Edit `home_hero.title` lewat admin panel → refresh Homepage customer → judul baru tampil
- [ ] Tambah testimoni baru lewat admin panel → muncul di Homepage; toggle `is_published = false` → hilang dari Homepage tanpa perlu hapus data
- [ ] Reorder trust items/milestones/values lewat admin panel → urutan berubah di frontend sesuai
- [ ] Ubah `category_content` (pillows) description → tile kategori di Homepage berubah teksnya
- [ ] Tambah/kurangi produk di Showcase Products (drag reorder) → grid showcase di Homepage berubah sesuai
- [ ] Ubah salah satu CTA URL jadi format tidak valid → backend menolak (sesuai validasi Fase 3.4)
- [ ] Akses `/api/admin/cms/*` tanpa token → 401

### 8.2 Deliverable Fase 8
- [ ] Seluruh skenario 8.1 lulus
- [ ] `npm run lint` dan `npm run typecheck` lulus di kedua repo (backend & frontend)
- [ ] Dokumentasi final: update `KUMORA_BACKEND_ADMIN_IMPLEMENTATION_PLAN_FINAL.md` dengan referensi silang ke dokumen ini sebagai "Fase lanjutan: CMS Konten Homepage & About"

---

## Ringkasan Urutan Fase

| Fase | Fokus | Dependency |
|---|---|---|
| 1 | Migration 19 tabel CMS | Tidak ada (independen dari tabel existing) |
| 2 | RLS untuk tabel CMS | Fase 1 |
| 3 | Backend API endpoint CMS | Fase 1, 2 |
| 4 | Seeding data verbatim | Fase 1, 3; sebagian bergantung produk sudah ter-seed (Fase 4.4) |
| 5 | Admin panel — restrukturisasi navigasi | Restrukturisasi admin panel ke frontend (sudah selesai sebelumnya) |
| 6 | Admin panel — form per resource | Fase 3, 5 |
| 7 | Frontend customer — migrasi ke data dinamis | Fase 4 (data harus sudah ada supaya bisa diuji) |
| 8 | Testing akhir end-to-end | Semua fase di atas |

**Kunci keberhasilan strategi ini:** risiko terbesar bukan di schema atau endpoint (itu pola yang sudah terbukti dari implementation plan Products sebelumnya), tapi di **ketepatan konten** — karena setiap kalimat di 19 tabel ini adalah teks yang sudah live dan dipercaya calon pembeli (testimoni, brand story, visi-misi). Kesalahan ketik atau parafrase yang "terasa lebih bagus" saat seeding justru mengubah suara brand tanpa sepengetahuan pemilik bisnis. Karena itu Fase 4 secara eksplisit menekankan "verbatim" dan Fase 7.5 menyediakan cara audit konkret untuk memastikan tidak ada versi lama (hardcoded) yang diam-diam masih nyangkut di kode setelah migrasi ke CMS selesai.
