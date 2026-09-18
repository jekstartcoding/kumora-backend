// Fase 1 & 2 — verifikasi migration CMS: constraint singleton + RLS.
// Bukan bagian dari runtime server — script verifikasi saja.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL as string;
const pub = createClient(supabaseUrl, process.env.SUPABASE_PUBLISHABLE_KEY);
const sec = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY);

const HERO = {
  id: 1,
  hook: 'T',
  title: 'T',
  subtitle: 'T',
  cta_1_text: 'T',
  cta_1_url: '/x',
  cta_2_text: 'T',
  cta_2_url: '/y',
};

async function main() {
  // seed satu row untuk pengujian, via secret
  const seeded = await sec.from('home_hero').upsert(HERO);
  if (seeded.error) throw seeded.error;

  // 1. coba insert row ke-2 (id=2) — harus ditolak check (id = 1)
  const dup = await sec
    .from('home_hero')
    .insert({ ...HERO, id: 2, title: 'X' });
  console.log(
    '1. insert id=2 ditolak?',
    dup.error ? 'YA (' + dup.error.code + ' ' + dup.error.message.slice(0, 60) + ')' : 'TIDAK — BUG!'
  );

  // 2. public read harus bisa
  const pubRead = await pub.from('home_hero').select('id');
  console.log(
    '2. public read OK?',
    !pubRead.error && pubRead.data?.length === 1 ? 'YA' : 'TIDAK ' + JSON.stringify(pubRead.error)
  );

  // 3. public write harus ditolak RLS
  const pubWrite = await pub
    .from('home_hero')
    .upsert({ ...HERO, title: 'HACK' });
  console.log(
    '3. public write ditolak?',
    pubWrite.error ? 'YA (' + pubWrite.error.code + ')' : 'TIDAK — BUG RLS!'
  );

  // 4. row singleton tetap 1
  const count = await sec.from('home_hero').select('id');
  console.log('4. row singleton tetap 1?', count.data?.length === 1 ? 'YA' : 'TIDAK');

  // 5. khusus testimonials: is_published=false tersembunyi dari public, terlihat via secret
  const t = await sec
    .from('testimonials')
    .insert({ author_name: 'RLS Test', author_location: 'Test', rating: 5, comment: 'x', order_index: 999, is_published: false })
    .select('id');
  if (t.error) throw t.error;
  const tid = t.data[0].id;

  const pubT = await pub.from('testimonials').select('id').eq('id', tid);
  console.log(
    '5a. testimoni unpublished tersembunyi dari public?',
    !pubT.error && pubT.data.length === 0 ? 'YA' : 'TIDAK — BUG RLS!'
  );
  const secT = await sec.from('testimonials').select('id').eq('id', tid);
  console.log(
    '5b. testimoni unpublished terlihat via secret?',
    !secT.error && secT.data.length === 1 ? 'YA' : 'TIDAK — BUG!'
  );

  // bersihkan testimoni test
  await sec.from('testimonials').delete().eq('id', tid);

  // 6. hitung tabel CMS yang ada (sanity check 19 tabel)
  const tables = [
    'home_hero', 'home_showcase_section', 'home_showcase_products',
    'home_philosophy_teaser', 'home_trust_section', 'home_trust_items',
    'home_category_section', 'category_content', 'home_banner',
    'home_testimonials_section', 'testimonials', 'home_final_cta',
    'about_hero', 'about_story', 'about_milestones_section', 'about_milestones',
    'about_vision_mission', 'about_mission_items', 'about_values_section',
    'about_values', 'about_final_cta',
  ];
  let ok = 0;
  for (const tb of tables) {
    const r = await sec.from(tb).select('*').limit(1);
    if (!r.error) ok++;
    else console.log('   MISSING/BROKEN:', tb, r.error.message.slice(0, 50));
  }
  console.log(`6. tabel CMS terverifikasi: ${ok}/${tables.length} (21 = 19 section + showcase + category)`);
}

main().catch((e) => {
  console.error('GAGAL:', e.message ?? e);
  process.exit(1);
});
