-- Fase 1 — CMS content tables (KUMORA_CMS_IMPLEMENTATION_PLAN_FINAL.md 1.2/1.3)
-- 19 tabel: 8 section homepage (+ child), 6 section about (+ child), plus category_content.
-- Singleton pattern ditegakkan di level database: id int primary key default 1 check (id = 1).
-- Tidak menyentuh tabel existing (products, variants, reviews, quiz_*).

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
