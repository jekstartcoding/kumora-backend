// Fase 4.3 — upload gambar CMS ke bucket `cms-images` lalu update row terkait.
// Mapping file → field mengikuti tabel deskripsi visual di plan 4.3.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const DIR = path.resolve(__dirname, '../../tmp-cms');

// [file, tabel, kolom, filter, path di bucket]
const MAP: [string, string, string, Record<string, unknown>, string][] = [
  ['hero.jpg', 'home_hero', 'background_image_url', { id: 1 }, 'home/hero.jpg'],
  ['philosophy.jpg', 'home_philosophy_teaser', 'image_url', { id: 1 }, 'home/philosophy.jpg'],
  ['cat-pillows.jpg', 'category_content', 'tile_image_url', { category: 'pillows' }, 'category/pillows.jpg'],
  ['cat-bolsters.jpg', 'category_content', 'tile_image_url', { category: 'bolsters' }, 'category/bolsters.jpg'],
  ['cat-beds.jpg', 'category_content', 'tile_image_url', { category: 'beds' }, 'category/beds.jpg'],
  ['banner.jpg', 'home_banner', 'background_image_url', { id: 1 }, 'home/banner.jpg'],
  ['about-hero.jpg', 'about_hero', 'background_image_url', { id: 1 }, 'about/hero.jpg'],
  ['about-story.jpg', 'about_story', 'image_url', { id: 1 }, 'about/story.jpg'],
];

async function main() {
  const results: string[] = [];
  for (const [file, table, column, filter, storagePath] of MAP) {
    const buf = fs.readFileSync(path.join(DIR, file));
    const { error: upErr } = await sb.storage.from('cms-images').upload(storagePath, buf, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (upErr) throw new Error(`${file} upload: ${upErr.message}`);
    const { data } = sb.storage.from('cms-images').getPublicUrl(storagePath);
    const { error: updErr } = await sb.from(table).update({ [column]: data.publicUrl }).match(filter);
    if (updErr) throw new Error(`${table}.${column}: ${updErr.message}`);
    results.push(`${file} → ${table}.${column} OK`);
    console.log(`  ${file} → ${table}.${column} OK`);
  }
  console.log('SEMUA GAMBAR TER-UPLOAD & TER-UPDATE.');
}

main().catch((e) => {
  console.error('GAGAL:', e.message ?? e);
  process.exit(1);
});
