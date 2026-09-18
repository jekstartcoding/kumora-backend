# RLS Policy Notes

Referensi policy Row Level Security untuk project Supabase Kumora
(`gfzlatthbgumketohkwn`). Dipakai sebagai acuan kalau nanti ada tabel baru
ditambahkan — tabel baru **wajib** mengikuti pola yang sama sebelum dianggap
selesai (plan: Prinsip Kerja #2).

## Prinsip

- Situs customer membaca **langsung** dari Supabase REST memakai **Publishable key**
  (dulu "anon key") — makanya setiap tabel butuh policy `select` untuk publik.
- Satu-satunya jalan **tulis** adalah backend Express memakai **Secret key**
  (dulu "service_role key"), yang secara desain Supabase **bypass RLS**.
- Karena itu policy yang dibuat **hanya** `for select using (true)`.
  Tidak ada policy insert/update/delete untuk publik di tabel manapun.

## Tabel & policy berlaku (migration 0002_enable_rls.sql)

| Tabel | RLS | Policy | Aksi | Target |
|---|---|---|---|---|
| `products` | ✅ enable | `public_read_products` | select | publik |
| `product_images` | ✅ enable | `public_read_product_images` | select | publik |
| `product_variants` | ✅ enable | `public_read_product_variants` | select | publik |
| `product_reviews` | ✅ enable | `public_read_product_reviews` | select | publik |
| `quiz_options` | ✅ enable | `public_read_quiz_options` | select | publik |
| `quiz_mappings` | ✅ enable | `public_read_quiz_mappings` | select | publik |

## Hasil verifikasi (Fase 2.3, dijalankan setelah migration 0002)

- `GET /rest/v1/<tabel>` dengan Publishable key → **200** di semua 6 tabel ✅
- `POST` produk dengan Publishable key → **ditolak** `42501` "violates row-level
  security policy" (HTTP 401) ✅
- `PATCH`/`DELETE` dengan Publishable key ke row yang **benar-benar ada** →
  PostgREST membalas 200/204 tapi **0 row terdampak** (row tidak berubah dan
  tidak terhapus, diverifikasi membaca ulang via Secret key) ✅

> Catatan perilaku PostgREST: tanpa policy write, statement update/delete yang
> "cocok" dengan 0 row (karena RLS menyaring semuanya) tidak menghasilkan error,
> melainkan no-op yang tampak sukses. Buktinya bukan HTTP status, melainkan
> data yang tidak berubah. Untuk pengecekan cepat ke depan, gunakan insert
> (yang memang error `42501`).

## Checklist tabel baru

1. Buat tabel lewat file migration di `supabase/migrations/` (bukan Studio UI).
2. `alter table <tabel> enable row level security;`
3. Buat policy `select` publik **hanya jika** memang boleh dibaca customer.
4. Jangan pernah buat policy write untuk peran publik.
5. Uji: select Publishable key harus 200; insert Publishable key harus ditolak.

## Tabel CMS (migration 0006_cms_rls.sql — plan CMS Fase 2)

19 tabel CMS konten (Homepage & About) mengikuti pola yang sama: RLS aktif,
public read lewat policy `public_read_<tabel>` `using (true)`, tanpa policy
write untuk public.

Homepage: `home_hero`, `home_showcase_section`, `home_showcase_products`,
`home_philosophy_teaser`, `home_trust_section`, `home_trust_items`,
`home_category_section`, `category_content`, `home_banner`,
`home_testimonials_section`, `testimonials`, `home_final_cta`.

About: `about_hero`, `about_story`, `about_milestones_section`,
`about_milestones`, `about_vision_mission`, `about_mission_items`,
`about_values_section`, `about_values`, `about_final_cta`.

**Pengecualian `testimonials`:** policy `public_read_testimonials` pakai
`using (is_published = true)` — baris dengan `is_published = false` tidak
tampil ke customer (Publishable key), tapi tetap terlihat via Secret key
(admin panel). Hasil verifikasi migration 0006: insert id=2 ke singleton
ditolak `23514`; public read 200; public write ditolak `42501`; testimoni
unpublished tersembunyi dari public & terlihat via secret.
