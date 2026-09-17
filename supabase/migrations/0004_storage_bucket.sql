-- Fase 4.1 — bucket Storage untuk gambar produk.
-- Dibuat lewat migration (migration-first, Prinsip Kerja #4), bukan manual di Studio.
-- Public = true supaya URL gambar bisa dibaca situs customer langsung;
-- tulis hanya lewat backend dengan Secret key (bypass storage policies).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
