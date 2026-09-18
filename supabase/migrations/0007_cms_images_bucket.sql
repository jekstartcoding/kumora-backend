-- Fase 4.3 — bucket Storage khusus aset CMS (direkomendasikan plan: bucket
-- terpisah dari product-images karena siklus hidup asetnya beda).
insert into storage.buckets (id, name, public)
values ('cms-images', 'cms-images', true)
on conflict (id) do update set public = true;

-- Public read untuk aset CMS (dilayani langsung via public URL).
create policy "public_read_cms_images" on storage.objects
  for select using (bucket_id = 'cms-images');
