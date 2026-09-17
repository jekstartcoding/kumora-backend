-- supabase/migrations/0001_init_products.sql
-- Fase 1 — Desain Schema Database: turunan langsung dari Product interface
-- (kontrak KUMORA_UX_MIGRATION_IMPLEMENTATION_PLAN_FINAL.md Fase 0.4).

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
