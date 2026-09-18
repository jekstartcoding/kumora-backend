// Fase 3 — verifikasi endpoint CMS end-to-end (plan 3.5).
// Butuh server dev berjalan di :3000.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const BASE = 'http://localhost:3000/api/admin/cms';

async function main() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  const { data: { users }, error: listErr } = await sb.auth.admin.listUsers();
  if (listErr) throw listErr;
  const admin = users.find((u: { email?: string }) => u.email === 'kumoraadmin@gmail.com');
  if (!admin) throw new Error('akun kumoraadmin@gmail.com tidak ada');
  // Akun placeholder — password direset ke nilai yang diketahui lalu login
  // dengan password via Publishable key (alur 5.1 plan backend).
  const { error: resetErr } = await sb.auth.admin.updateUserById(admin.id, { password: 'KumoraAdmin2024!' });
  if (resetErr) throw resetErr;
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
  const { data: sess, error: sessErr } = await anon.auth.signInWithPassword({
    email: admin.email!,
    password: 'KumoraAdmin2024!',
  });
  let token: string;
  if (!sessErr && sess.session?.access_token) {
    token = sess.session.access_token;
  } else {
    throw new Error('gagal bikin sesi admin: ' + (sessErr?.message ?? 'unknown'));
  }
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const j = async (r: Response) => {
    const body = await r.json().catch(() => null);
    return { status: r.status, body };
  };

  // --- 1. 401 tanpa token
  const noAuth = await j(await fetch(`${BASE}/home-hero`));
  console.log('1. GET /home-hero tanpa token →', noAuth.status === 401 ? '401 OK' : 'BUG ' + noAuth.status);

  // --- 2. PUT singleton dua kali berturut-turut (deliverable 3.5) — data uji, bukan seed final
  const p1 = await j(await fetch(`${BASE}/home-hero`, { method: 'PUT', headers: H, body: JSON.stringify({ hook: 'Uji1', title: 'Uji1', subtitle: 'Uji1', cta_1_text: 'A', cta_1_url: '/shop/pillows', cta_2_text: 'B', cta_2_url: '/quiz' }) }));
  const p2 = await j(await fetch(`${BASE}/home-hero`, { method: 'PUT', headers: H, body: JSON.stringify({ hook: 'Uji2', title: 'Uji2', subtitle: 'Uji2', cta_1_text: 'A2', cta_1_url: '/shop/pillows', cta_2_text: 'B2', cta_2_url: '/quiz' }) }));
  console.log('2. PUT 2x →', p1.status, p2.status, '| row tetap 1 & data terakhir?',
    p2.body?.data?.hook === 'Uji2' ? 'YA' : 'BUG: ' + JSON.stringify(p2.body));

  // --- 3. validasi 3.4 URL rusak ditolak
  const badUrl = await j(await fetch(`${BASE}/home-hero`, { method: 'PUT', headers: H, body: JSON.stringify({ cta_1_url: 'bukan-url-rusak' }) }));
  console.log('3. PUT cta_1_url rusak →', badUrl.status === 400 && badUrl.body?.error?.code === 'INVALID_URL' ? 'ditolak OK' : 'BUG ' + JSON.stringify(badUrl.body));

  // --- 4. list CRUD trust-items + reorder
  const mk = await j(await fetch(`${BASE}/trust-items`, { method: 'POST', headers: H, body: JSON.stringify({ icon_name: 'layers', title: 'T-Uji', description: 'D-Uji' }) }));
  const mkId = mk.body?.data?.id;
  console.log('4a. POST trust-items →', mk.status === 201 ? '201 OK' : 'BUG ' + JSON.stringify(mk.body));
  const up = await j(await fetch(`${BASE}/trust-items/${mkId}`, { method: 'PATCH', headers: H, body: JSON.stringify({ title: 'T-Uji2' }) }));
  console.log('4b. PATCH →', up.status === 200 && up.body?.data?.title === 'T-Uji2' ? 'OK' : 'BUG ' + JSON.stringify(up.body));

  // buat row kedua supaya uji reorder bermakna (tabel masih kosong sebelum Fase 4)
  const mk2 = await j(await fetch(`${BASE}/trust-items`, { method: 'POST', headers: H, body: JSON.stringify({ icon_name: 'heart', title: 'T-Uji-B', description: 'D-Uji-B' }) }));
  const mk2Id = mk2.body?.data?.id;
  // reorder: ambil 2 row uji, tukar
  const lst = await j(await fetch(`${BASE}/trust-items`, { headers: H }));
  const two = lst.body.data.filter((r: { id: string }) => r.id === mkId || r.id === mk2Id);
  const reorder = await j(await fetch(`${BASE}/trust-items/reorder`, { method: 'PATCH', headers: H, body: JSON.stringify({ items: [{ id: two[0].id, order_index: two[1].order_index }, { id: two[1].id, order_index: two[0].order_index }] }) }));
  console.log('4c. reorder swap →', reorder.status === 200 ? 'OK' : 'BUG ' + JSON.stringify(reorder.body));

  // reorder duplikat harus ditolak (3.4)
  const dupOrder = await j(await fetch(`${BASE}/trust-items/reorder`, { method: 'PATCH', headers: H, body: JSON.stringify({ items: [{ id: two[0].id, order_index: 5 }, { id: two[1].id, order_index: 5 }] }) }));
  console.log('4d. reorder order duplikat →', dupOrder.status === 400 && dupOrder.body?.error?.code === 'DUPLICATE_ORDER' ? 'ditolak OK' : 'BUG ' + JSON.stringify(dupOrder.body));

  // restore urutan + hapus row uji
  await fetch(`${BASE}/trust-items/reorder`, { method: 'PATCH', headers: H, body: JSON.stringify({ items: [{ id: two[0].id, order_index: two[0].order_index }, { id: two[1].id, order_index: two[1].order_index }] }) });
  const del = await j(await fetch(`${BASE}/trust-items/${mkId}`, { method: 'DELETE', headers: H }));
  const del2 = await j(await fetch(`${BASE}/trust-items/${mk2Id}`, { method: 'DELETE', headers: H }));
  console.log('4e. DELETE row uji →', del.status === 200 && del2.status === 200 ? 'OK' : 'BUG ' + JSON.stringify(del.body));

  // --- 5. category-content khusus
  const cc = await j(await fetch(`${BASE}/category-content`, { headers: H }));
  console.log('5a. GET category-content →', cc.status === 200 && cc.body.data.length === 3 ? '3 kategori OK' : 'BUG ' + JSON.stringify(cc.body));
  const ccPatch = await j(await fetch(`${BASE}/category-content/pillows`, { method: 'PATCH', headers: H, body: JSON.stringify({ description: 'Kenyamanan yang menopang untuk setiap gaya tidur.' }) }));
  console.log('5b. PATCH pillows →', ccPatch.status === 200 ? 'OK' : 'BUG ' + JSON.stringify(ccPatch.body));
  const ccBad = await j(await fetch(`${BASE}/category-content/tables`, { method: 'PATCH', headers: H, body: JSON.stringify({ description: 'x' }) }));
  console.log('5c. PATCH kategori asing →', ccBad.status === 400 ? 'ditolak OK' : 'BUG ' + JSON.stringify(ccBad.body));

  console.log('SELESAI — semua uji Fase 3 di atas.');
}

main().catch((e) => {
  console.error('GAGAL:', e.message ?? e);
  process.exit(1);
});
