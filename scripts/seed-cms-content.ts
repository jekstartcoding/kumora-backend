// Fase 4 — Seeding CMS verbatim (plan 4.1–4.4).
// Dijalankan via Node/TS (BUKAN file .sql mentah) karena:
//  1. WHATSAPP_NUMBER diekstrak dari sumber yang sama dengan generator pesan WA
//     (frontend/src/data/content.ts) — satu sumber kebenaran, bukan hardcode terpisah.
//  2. home_showcase_products butuh product_id nyata, di-resolve dari slug produk
//     yang sudah ter-seed (dicek dulu ke database, bukan diasumsikan).
// Semua teks = kontrak verbatim dari plan 4.2 — JANGAN parafrase.
// Idempoten: singleton pakai upsert, repeater hanya mengisi yang belum ada.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// --- WHATSAPP_NUMBER: ekstrak dari file generator WA frontend (sumber tunggal) ---
function extractWhatsappNumber(): string {
  const file = path.resolve(__dirname, '../../frontend/src/data/content.ts');
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/WHATSAPP_NUMBER\s*=\s*'([^']+)'/);
  if (!m) throw new Error(`WHATSAPP_NUMBER tidak ketemu di ${file}`);
  return m[1];
}

const WA_NUMBER = extractWhatsappNumber();
// Teks pesan CTA persis seperti plan 4.2 (encoded verbatim).
const WA_URL =
  `https://wa.me/${WA_NUMBER}` +
  `?text=Hi%20Kumora!%20I%27m%20interested%20in%20the%20Kumora%20products%20%E2%80%93%20general%20inquiry.%20Could%20you%20help%20me%20with%20the%20order%3F`;

// Slug showcase sesuai KATALOG ASLI yang sudah ter-seed (dicek sebelum dijalankan,
// sesuai catatan plan 4.4 — bukan mengikuti contoh slug di file).
const SHOWCASE_SLUGS = ['kumora-cloud-pillow', 'kumora-align-pillow', 'kumora-breeze-pillow', 'kumora-comfort-bolster'];

async function upsertSingleton(table: string, row: Record<string, unknown>) {
  const { error } = await sb.from(table).upsert({ id: 1, ...row });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  upsert ${table} OK`);
}

async function fillRepeater(
  table: string,
  rows: Record<string, unknown>[],
  matchKey: (r: Record<string, unknown>) => string
) {
  const { data: existing, error } = await sb.from(table).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  const existingKeys = new Set((existing ?? []).map(matchKey));
  const missing = rows.filter((r) => !existingKeys.has(matchKey(r)));
  if (missing.length > 0) {
    const { error: insErr } = await sb.from(table).insert(missing);
    if (insErr) throw new Error(`${table}: ${insErr.message}`);
  }
  console.log(`  ${table}: +${missing.length} (skip ${rows.length - missing.length} sudah ada)`);
}

async function main() {
  console.log('WHATSAPP_NUMBER (dari frontend/src/data/content.ts):', WA_NUMBER);

  // ============ HOMEPAGE ============
  await upsertSingleton('home_hero', {
    hook: 'Seni Istirahat yang Lebih Baik',
    title: 'Tidur Lebih Nyenyak. Hidup Lebih Baik.',
    subtitle:
      'Kumora menghadirkan perlengkapan tidur dan kamar yang dirancang dengan penuh perhatian untuk kenyamanan yang lebih baik setiap hari.',
    background_image_url: null, // 4.3 — gambar dicari terpisah
    cta_1_text: 'Lihat Produk',
    cta_1_url: '/shop/pillows',
    cta_2_text: 'Hubungi Kami',
    cta_2_url: WA_URL,
  });

  await upsertSingleton('home_showcase_section', {
    eyebrow: 'KOLEKSI KAMI',
    title: 'Kenyamanan yang Dipilih untuk Anda',
    subtitle: 'Temukan perlengkapan sehari-hari yang dirancang untuk menjadikan kamar Anda lebih nyaman.',
  });

  await upsertSingleton('home_philosophy_teaser', {
    eyebrow: 'FILOSOFI KAMI',
    title: 'Dibuat untuk Istirahat yang Nyata',
    paragraph_1:
      'Kumora lahir dari pemahaman sederhana: istirahat berkualitas membutuhkan perlengkapan yang benar-benar bekerja untuk tubuh Anda. Kami tidak percaya pada klaim berlebihan — kami fokus pada bahan terbaik, konstruksi yang teliti, dan kenyamanan yang konsisten setiap malam.',
    paragraph_2:
      'Setiap produk kami uji langsung dalam kehidupan sehari-hari, memastikan setiap serat dan lapisan memberikan kenyamanan yang Anda rasakan sejak pemakaian pertama.',
    link_text: 'Kenali Kisah Kami',
    link_url: '/about',
    image_url: null, // 4.3
  });

  await upsertSingleton('home_trust_section', { eyebrow: 'MENGAPA KUMORA', title: 'Dibuat dengan Kenyamanan sebagai Dasar' });

  await fillRepeater(
    'home_trust_items',
    [
      { icon_name: 'layers', title: 'Bahan Terpilih', description: 'Kami memilih bahan dengan perhatian pada kenyamanan dan daya tahan sehari-hari.', order_index: 0 },
      { icon_name: 'heart', title: 'Kenyamanan Sehari-hari', description: 'Produk kami dirancang untuk mendukung istirahat yang lebih baik tanpa mengorbankan kegunaan.', order_index: 1 },
      { icon_name: 'sparkles', title: 'Kualitas yang Terasa', description: 'Kami memperhatikan bahan, konstruksi, dan detail yang membuat produk sehari-hari lebih baik.', order_index: 2 },
      { icon_name: 'headphones', title: 'Layanan Personal', description: 'Tim kami siap melayani lewat WhatsApp untuk membantu pelanggan menemukan produk yang tepat.', order_index: 3 },
    ],
    (r) => r.title as string
  );

  await upsertSingleton('home_category_section', { eyebrow: 'PILIH BERDASARKAN KATEGORI', title: 'Temukan Kenyamanan Anda' });

  // category_content: upsert per kategori (3 row tetap)
  for (const c of [
    { category: 'pillows', display_name: 'Pillows', description: 'Kenyamanan yang menopang untuk setiap gaya tidur.', tile_image_url: null, link_text: 'Lihat' },
    { category: 'bolsters', display_name: 'Bolsters', description: 'Dukungan seimbang untuk posisi tidur yang lebih lurus.', tile_image_url: null, link_text: 'Lihat' },
    { category: 'beds', display_name: 'Beds', description: 'Dukungan seimbang untuk malam yang lebih nyenyak.', tile_image_url: null, link_text: 'Lihat' },
  ]) {
    const { error } = await sb.from('category_content').upsert(c);
    if (error) throw new Error(`category_content: ${error.message}`);
  }
  console.log('  category_content: 3 kategori OK');

  await upsertSingleton('home_banner', {
    title: 'Istirahat Anda Berarti.',
    subtitle: 'Karena hari yang lebih baik dimulai dari malam yang lebih nyenyak.',
    background_image_url: null, // 4.3
  });

  await upsertSingleton('home_testimonials_section', { eyebrow: 'TESTIMONI', title: 'Disukai Mereka yang Tidurnya Lebih Nyenyak' });

  await fillRepeater(
    'testimonials',
    [
      { author_name: 'Andi Pratama', author_location: 'Bandung', rating: 5, comment: 'Bantal Cloud terasa lembut tanpa kehilangan dukungan yang saya butuhkan. Saya tidur jauh lebih nyaman sekarang.', order_index: 0, is_published: true },
      { author_name: 'Nadia Putri', author_location: 'Jakarta', rating: 5, comment: 'Saya suka betapa sederhana tampilan Seprai Signature. Bahannya juga terasa jauh lebih premium dari yang saya kira.', order_index: 1, is_published: true },
      { author_name: 'Rizky Mahendra', author_location: 'Bekasi', rating: 5, comment: 'Tim Kumora membantu saya memilih kasur berdasarkan gaya tidur saya, bukan sekadar merekomendasikan yang paling mahal.', order_index: 2, is_published: true },
    ],
    (r) => (r.comment as string).slice(0, 40)
  );

  await upsertSingleton('home_final_cta', {
    title: 'Siap Menemukan Kenyamanan Anda?',
    subtitle: 'Jelajahi koleksi Kumora atau bicara langsung dengan tim kami untuk menemukan produk yang tepat untuk Anda.',
    cta_1_text: 'Lihat Produk',
    cta_1_url: '/shop/pillows',
    cta_2_text: 'Belum tahu yang cocok? Temukan pilihan Anda',
    cta_2_url: '/quiz',
    cta_3_text: 'Chat melalui WhatsApp',
    cta_3_url: WA_URL,
  });

  // ============ ABOUT ============
  await upsertSingleton('about_hero', {
    eyebrow: 'Kisah Kami',
    title: 'Dirancang untuk Istirahat yang Lebih Baik.',
    subtitle:
      'Kumora adalah merek perlengkapan tidur dan kamar yang berfokus pada membuat kenyamanan sehari-hari terasa lebih penuh perhatian, mudah dijangkau, dan personal.',
    background_image_url: null, // 4.3
  });

  await upsertSingleton('about_story', {
    title: 'Satu Gagasan Sederhana: Istirahat Lebih Baik untuk Keseharian',
    paragraph_1:
      'Kumora didirikan pada tahun 2015 dengan gagasan sederhana: setiap orang berhak atas tempat istirahat yang nyaman. Apa yang dimulai sebagai koleksi kecil bantal sehari-hari perlahan berkembang menjadi rangkaian perlengkapan kamar yang lebih luas.',
    paragraph_2:
      'Saat ini, Kumora menggabungkan bantal, kasur, seprai, dan aksesori kamar dalam satu merek, sambil tetap berpegang pada prinsip awal: menjadikan istirahat sehari-hari lebih baik.',
    image_url: null, // 4.3
  });

  await upsertSingleton('about_milestones_section', { eyebrow: 'PERJALANAN KAMI', title: 'Pencapaian' });

  await fillRepeater(
    'about_milestones',
    [
      { counter_number: 15, year: 2015, title: 'Kumora Didirikan', description: 'Kumora memulai perjalanan dengan koleksi perlengkapan tidur sehari-hari pertamanya.', order_index: 0 },
      { counter_number: 18, year: 2018, title: 'Koleksi Bantal Pertama', description: 'Merek memperluas lini bantal dengan beberapa profil kenyamanan.', order_index: 1 },
      { counter_number: 21, year: 2021, title: 'Memasuki Kamar Tidur', description: 'Kumora meluncurkan produk kasur dan perlengkapan tidur.', order_index: 2 },
      { counter_number: 24, year: 2024, title: 'Koleksi Kamar Lengkap', description: 'Portofolio produk berkembang menjadi koleksi perlengkapan kamar yang lengkap.', order_index: 3 },
      { counter_number: 26, year: 2026, title: 'Tumbuh Bersama Anda', description: 'Kumora mulai memperluas kehadiran digital dan pengalaman pelanggan.', order_index: 4 },
    ],
    (r) => r.title as string
  );

  await upsertSingleton('about_vision_mission', {
    vision_label: 'VISI',
    vision_text: 'Menjadi nama terpercaya dalam kenyamanan tidur dan kamar sehari-hari.',
    mission_label: 'MISI',
  });

  await fillRepeater(
    'about_mission_items',
    [
      { text: 'Menciptakan produk tidur yang nyaman dan dapat diandalkan.', order_index: 0 },
      { text: 'Terus meningkatkan bahan dan desain produk.', order_index: 1 },
      { text: 'Memberikan pengalaman pelanggan yang mudah dan personal.', order_index: 2 },
      { text: 'Membangun hubungan jangka panjang dengan pelanggan.', order_index: 3 },
    ],
    (r) => r.text as string
  );

  await upsertSingleton('about_values_section', { eyebrow: 'YANG KAMI PEGANG', title: 'Nilai Utama' });

  await fillRepeater(
    'about_values',
    [
      { title: 'KENYAMANAN', description: 'Kenyamanan adalah fondasi dari semua yang kami ciptakan.', order_index: 0 },
      { title: 'KUALITAS', description: 'Kami memperhatikan bahan, konstruksi, dan detail di balik setiap produk.', order_index: 1 },
      { title: 'KEPEDULIAN', description: 'Kami mendengarkan pelanggan dan merancang berdasarkan kebutuhan sehari-hari yang nyata.', order_index: 2 },
      { title: 'PERTUMBUHAN', description: 'Kami terus berkembang seiring perubahan gaya hidup, ekspektasi, dan teknologi.', order_index: 3 },
    ],
    (r) => r.title as string
  );

  await upsertSingleton('about_final_cta', {
    title: 'Jelajahi Koleksi Kumora',
    subtitle: 'Temukan perlengkapan tidur dan kamar yang dirancang dengan penuh perhatian.',
    cta_text: 'Lihat Produk',
    cta_url: '/shop/pillows',
  });

  // ============ Fase 4.4 — home_showcase_products (product_id dari slug asli) ============
  for (let i = 0; i < SHOWCASE_SLUGS.length; i++) {
    const slug = SHOWCASE_SLUGS[i];
    const { data: prod, error: pErr } = await sb.from('products').select('id, name').eq('slug', slug).maybeSingle();
    if (pErr) throw pErr;
    if (!prod) throw new Error(`produk dengan slug "${slug}" tidak ditemukan di tabel products — cek katalog asli`);
    const { data: dup } = await sb.from('home_showcase_products').select('id').eq('product_id', prod.id).maybeSingle();
    if (dup) {
      console.log(`  showcase[${i}] ${slug} — sudah ada, skip`);
      continue;
    }
    const { error: insErr } = await sb.from('home_showcase_products').insert({ product_id: prod.id, order_index: i });
    if (insErr) throw new Error(`showcase insert: ${insErr.message}`);
    console.log(`  showcase[${i}] ${slug} (${prod.name}) OK`);
  }

  console.log('SEED CMS SELESAI.');
}

main().catch((e) => {
  console.error('GAGAL:', e.message ?? e);
  process.exit(1);
});
