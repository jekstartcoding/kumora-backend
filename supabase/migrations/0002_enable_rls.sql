-- Fase 2 — Row Level Security & kebijakan akses.
-- Situs customer membaca langsung dari Supabase dengan Publishable key (public read),
-- operasi tulis hanya lewat backend Express dengan Secret key (bypass RLS by design).

-- 2.1 Aktifkan RLS di semua tabel
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table product_reviews enable row level security;
alter table quiz_options enable row level security;
alter table quiz_mappings enable row level security;

-- 2.2 Policy public read-only
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

-- Tidak ada policy insert/update/delete untuk publik di tabel manapun:
-- satu-satunya jalan tulis adalah backend Express (Secret key, bypass RLS).
