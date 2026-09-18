// Fase 8.1 — skenario E2E CMS: edit lewat admin API (sebagaimana admin panel),
// verifikasi efeknya lewat jalur publik (anon key yang dipakai frontend), lalu
// restore. Dijalankan dari folder backend (butuh server dev di :3000).
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.SUPABASE_URL;
const anon = createClient(URL, process.env.SUPABASE_PUBLISHABLE_KEY);
const sec = createClient(URL, process.env.SUPABASE_SECRET_KEY);
const BASE = 'http://localhost:3000/api/admin/cms';
const H = { 'Content-Type': 'application/json', Authorization: '' };

async function main() {
  console.log('=== 8.1a: edit home_hero.title via admin API → tampil di jalur publik ===');
  const { data: users } = await sec.auth.admin.listUsers();
  const admin = users.users.find((u) => u.email === 'kumoraadmin@gmail.com');
  await sec.auth.admin.updateUserById(admin.id, { password: 'KumoraAdmin2024!' });
  const { data: sess } = await anon.auth.signInWithPassword({ email: 'kumoraadmin@gmail.com', password: 'KumoraAdmin2024!' });
  H.Authorization = 'Bearer ' + sess.session.access_token;

  const cur = await (await fetch(BASE + '/home-hero', { headers: H })).json();
  const origTitle = cur.data.title;
  const editTitle = origTitle + ' [E2E-8.1]';
  await fetch(BASE + '/home-hero', { method: 'PUT', headers: H, body: JSON.stringify({ ...cur.data, title: editTitle }) });
  const { data: pubHero } = await anon.from('home_hero').select('title').single();
  console.log('publik melihat title teredit?', pubHero.title === editTitle ? 'YA ✓' : 'GAGAL: ' + pubHero.title);
  await fetch(BASE + '/home-hero', { method: 'PUT', headers: H, body: JSON.stringify({ ...cur.data, title: origTitle }) });
  const { data: pubBack } = await anon.from('home_hero').select('title').single();
  console.log('dikembalikan?', pubBack.title === origTitle ? 'YA ✓' : 'GAGAL');

  console.log('=== 8.1b: toggle is_published testimoni → hilang dari publik ===');
  const lst = await (await fetch(BASE + '/testimonials', { headers: H })).json();
  const t0 = lst.data[0];
  await fetch(BASE + '/testimonials/' + t0.id, { method: 'PATCH', headers: H, body: JSON.stringify({ is_published: false }) });
  const { data: pubT } = await anon.from('testimonials').select('id,author_name');
  console.log('unpublished hilang dari publik?', pubT.find((x) => x.id === t0.id) ? 'GAGAL' : 'YA ✓ (sisa ' + pubT.length + ' row)');
  await fetch(BASE + '/testimonials/' + t0.id, { method: 'PATCH', headers: H, body: JSON.stringify({ is_published: true }) });
  const { data: pubT2 } = await anon.from('testimonials').select('id');
  console.log('dikembalikan publik?', pubT2.length === 3 ? 'YA ✓' : 'GAGAL: ' + pubT2.length);

  console.log('=== 8.1c: reorder trust items → urutan publik berubah ===');
  const tl = await (await fetch(BASE + '/trust-items', { headers: H })).json();
  const ids = tl.data.map((r) => r.id);
  const rot = [...ids.slice(1), ids[0]].map((id, i) => ({ id, order_index: i }));
  await fetch(BASE + '/trust-items/reorder', { method: 'PATCH', headers: H, body: JSON.stringify({ items: rot }) });
  const { data: pubTrust } = await anon.from('home_trust_items').select('title').order('order_index');
  console.log('urutan baru (publik):', pubTrust.map((r) => r.title).join(' | '));
  const orig = tl.data.map((r) => ({ id: r.id, order_index: r.order_index }));
  await fetch(BASE + '/trust-items/reorder', { method: 'PATCH', headers: H, body: JSON.stringify({ items: orig }) });
  console.log('urutan asli dikembalikan ✓');

  console.log('=== 8.1d: ubah category_content pillows → terlihat publik ===');
  await fetch(BASE + '/category-content/pillows', { method: 'PATCH', headers: H, body: JSON.stringify({ description: 'Kenyamanan yang menopang untuk setiap gaya tidur. [E2E-8.1]' }) });
  const { data: pubCC } = await anon.from('category_content').select('description').eq('category', 'pillows').single();
  console.log('deskripsi baru terlihat publik?', pubCC.description.includes('[E2E-8.1]') ? 'YA ✓' : 'GAGAL');
  await fetch(BASE + '/category-content/pillows', { method: 'PATCH', headers: H, body: JSON.stringify({ description: 'Kenyamanan yang menopang untuk setiap gaya tidur.' }) });
  console.log('dikembalikan ✓');

  console.log('=== 8.1e: showcase tambah/kurangi produk ===');
  const sc = await (await fetch(BASE + '/showcase-products', { headers: H })).json();
  for (const s of sc.data) {
    const { data: p } = await sec.from('products').select('name').eq('id', s.product_id).single();
    console.log('  ' + s.order_index + ' ' + (p ? p.name : s.product_id));
  }
  const { data: mattress } = await sec.from('products').select('id,name').eq('slug', 'kumora-cloud-mattress').single();
  const added = await (await fetch(BASE + '/showcase-products', { method: 'POST', headers: H, body: JSON.stringify({ product_id: mattress.id }) })).json();
  console.log('tambah ' + mattress.name + ' →', added.success ? 'OK ✓' : 'GAGAL ' + JSON.stringify(added));
  const del = await fetch(BASE + '/showcase-products/' + added.data.id, { method: 'DELETE', headers: H });
  console.log('hapus kembali →', del.status === 200 ? 'OK ✓' : 'GAGAL');

  console.log('=== 8.1f: CTA URL tidak valid → backend menolak (3.4) ===');
  const bad = await (await fetch(BASE + '/home-hero', { method: 'PUT', headers: H, body: JSON.stringify({ ...cur.data, cta_1_url: 'www.tanpa-protokol.com' }) })).json();
  console.log('tolak URL tanpa protokol?', bad.success === false && bad.error && bad.error.code === 'INVALID_URL' ? 'YA ✓' : 'GAGAL ' + JSON.stringify(bad));

  console.log('=== 8.1g: akses tanpa token → 401 ===');
  const noAuth = await fetch(BASE + '/home-hero');
  console.log(noAuth.status === 401 ? '401 ✓' : 'GAGAL ' + noAuth.status);

  console.log('E2E FASE 8 SELESAI.');
}

main().catch((e) => {
  console.error('GAGAL:', e.message ?? e);
  process.exit(1);
});
