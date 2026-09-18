-- Fase 2 — RLS untuk tabel CMS (KUMORA_CMS_IMPLEMENTATION_PLAN_FINAL.md 2.1)
-- Public read untuk semua tabel CMS; write tidak diberikan ke public (hanya
-- lewat backend dengan Secret key). Khusus testimonials: public read hanya
-- baris is_published = true supaya admin bisa "menyembunyikan" tanpa menghapus.

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
