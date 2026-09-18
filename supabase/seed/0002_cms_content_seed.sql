-- ============================================================================
-- REFERENSI — Fase 4 plan CMS (KUMORA_CMS_IMPLEMENTATION_PLAN_FINAL.md 4.2)
--
-- JANGAN dijalankan langsung sebagai file SQL (mis. via CLI).
-- Eksekusi seeding wajib lewat scripts/seed-cms-content.ts, karena:
--   1. `current_setting('app.whatsapp_number', true)` di bawah hanyalah placeholder
--      teknik — SQL murni tidak bisa membaca .env aplikasi. Nilai WHATSAPP_NUMBER
--      di-interpolasi oleh script TS dari sumber yang sama dengan generator
--      pesan WA (frontend/src/data/content.ts).
--   2. `home_showcase_products` butuh product_id nyata yang di-resolve dari slug
--      produk yang sudah ter-seed (Fase 4.4), bukan hardcode.
-- Isi teks di file ini = kontrak verbatim; script TS memuat teks yang sama
-- persis.
-- ============================================================================

-- ============ HOMEPAGE SEED ============

insert into home_hero (id, hook, title, subtitle, background_image_url, cta_1_text, cta_1_url, cta_2_text, cta_2_url)
values (
  1,
  'Seni Istirahat yang Lebih Baik',
  'Tidur Lebih Nyenyak. Hidup Lebih Baik.',
  'Kumora menghadirkan perlengkapan tidur dan kamar yang dirancang dengan penuh perhatian untuk kenyamanan yang lebih baik setiap hari.',
  null, -- TODO: gambar dicari terpisah, lihat 4.3
  'Lihat Produk',
  '/shop/pillows',
  'Hubungi Kami',
  'https://wa.me/' || current_setting('app.whatsapp_number', true) || '?text=Hi%20Kumora!%20I%27m%20interested%20in%20the%20Kumora%20products%20%E2%80%93%20general%20inquiry.%20Could%20you%20help%20me%20with%20the%20order%3F'
)
on conflict (id) do update set
  hook = excluded.hook, title = excluded.title, subtitle = excluded.subtitle,
  cta_1_text = excluded.cta_1_text, cta_1_url = excluded.cta_1_url,
  cta_2_text = excluded.cta_2_text, cta_2_url = excluded.cta_2_url;

insert into home_showcase_section (id, eyebrow, title, subtitle) values (
  1, 'KOLEKSI KAMI', 'Kenyamanan yang Dipilih untuk Anda',
  'Temukan perlengkapan sehari-hari yang dirancang untuk menjadikan kamar Anda lebih nyaman.'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title, subtitle = excluded.subtitle;

-- home_showcase_products: diisi via seed script terpisah SETELAH data products ter-seed (Fase 4.4),
-- karena butuh product_id nyata dari tabel products, bukan bisa hardcode di sini.

insert into home_philosophy_teaser (id, eyebrow, title, paragraph_1, paragraph_2, link_text, link_url, image_url) values (
  1, 'FILOSOFI KAMI', 'Dibuat untuk Istirahat yang Nyata',
  'Kumora lahir dari pemahaman sederhana: istirahat berkualitas membutuhkan perlengkapan yang benar-benar bekerja untuk tubuh Anda. Kami tidak percaya pada klaim berlebihan — kami fokus pada bahan terbaik, konstruksi yang teliti, dan kenyamanan yang konsisten setiap malam.',
  'Setiap produk kami uji langsung dalam kehidupan sehari-hari, memastikan setiap serat dan lapisan memberikan kenyamanan yang Anda rasakan sejak pemakaian pertama.',
  'Kenali Kisah Kami', '/about', null
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title,
  paragraph_1 = excluded.paragraph_1, paragraph_2 = excluded.paragraph_2,
  link_text = excluded.link_text, link_url = excluded.link_url;

insert into home_trust_section (id, eyebrow, title) values (
  1, 'MENGAPA KUMORA', 'Dibuat dengan Kenyamanan sebagai Dasar'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into home_trust_items (icon_name, title, description, order_index) values
  ('layers', 'Bahan Terpilih', 'Kami memilih bahan dengan perhatian pada kenyamanan dan daya tahan sehari-hari.', 0),
  ('heart', 'Kenyamanan Sehari-hari', 'Produk kami dirancang untuk mendukung istirahat yang lebih baik tanpa mengorbankan kegunaan.', 1),
  ('sparkles', 'Kualitas yang Terasa', 'Kami memperhatikan bahan, konstruksi, dan detail yang membuat produk sehari-hari lebih baik.', 2),
  ('headphones', 'Layanan Personal', 'Tim kami siap melayani lewat WhatsApp untuk membantu pelanggan menemukan produk yang tepat.', 3);

insert into home_category_section (id, eyebrow, title) values (
  1, 'PILIH BERDASARKAN KATEGORI', 'Temukan Kenyamanan Anda'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into category_content (category, display_name, description, tile_image_url, link_text) values
  ('pillows', 'Pillows', 'Kenyamanan yang menopang untuk setiap gaya tidur.', null, 'Lihat'),
  ('bolsters', 'Bolsters', 'Dukungan seimbang untuk posisi tidur yang lebih lurus.', null, 'Lihat'),
  ('beds', 'Beds', 'Dukungan seimbang untuk malam yang lebih nyenyak.', null, 'Lihat')
on conflict (category) do update set display_name = excluded.display_name,
  description = excluded.description, link_text = excluded.link_text;

insert into home_banner (id, title, subtitle, background_image_url) values (
  1, 'Istirahat Anda Berarti.', 'Karena hari yang lebih baik dimulai dari malam yang lebih nyenyak.', null
) on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle;

insert into home_testimonials_section (id, eyebrow, title) values (
  1, 'TESTIMONI', 'Disukai Mereka yang Tidurnya Lebih Nyenyak'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into testimonials (author_name, author_location, rating, comment, order_index, is_published) values
  ('Andi Pratama', 'Bandung', 5, 'Bantal Cloud terasa lembut tanpa kehilangan dukungan yang saya butuhkan. Saya tidur jauh lebih nyaman sekarang.', 0, true),
  ('Nadia Putri', 'Jakarta', 5, 'Saya suka betapa sederhana tampilan Seprai Signature. Bahannya juga terasa jauh lebih premium dari yang saya kira.', 1, true),
  ('Rizky Mahendra', 'Bekasi', 5, 'Tim Kumora membantu saya memilih kasur berdasarkan gaya tidur saya, bukan sekadar merekomendasikan yang paling mahal.', 2, true);

insert into home_final_cta (id, title, subtitle, cta_1_text, cta_1_url, cta_2_text, cta_2_url, cta_3_text, cta_3_url) values (
  1,
  'Siap Menemukan Kenyamanan Anda?',
  'Jelajahi koleksi Kumora atau bicara langsung dengan tim kami untuk menemukan produk yang tepat untuk Anda.',
  'Lihat Produk', '/shop/pillows',
  'Belum tahu yang cocok? Temukan pilihan Anda', '/quiz',
  'Chat melalui WhatsApp',
  'https://wa.me/' || current_setting('app.whatsapp_number', true) || '?text=Hi%20Kumora!%20I%27m%20interested%20in%20the%20Kumora%20products%20%E2%80%93%20general%20inquiry.%20Could%20you%20help%20me%20with%20the%20order%3F'
) on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle,
  cta_1_text = excluded.cta_1_text, cta_1_url = excluded.cta_1_url,
  cta_2_text = excluded.cta_2_text, cta_2_url = excluded.cta_2_url,
  cta_3_text = excluded.cta_3_text, cta_3_url = excluded.cta_3_url;

-- ============ ABOUT SEED ============

insert into about_hero (id, eyebrow, title, subtitle, background_image_url) values (
  1, 'Kisah Kami', 'Dirancang untuk Istirahat yang Lebih Baik.',
  'Kumora adalah merek perlengkapan tidur dan kamar yang berfokus pada membuat kenyamanan sehari-hari terasa lebih penuh perhatian, mudah dijangkau, dan personal.',
  null
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title, subtitle = excluded.subtitle;

insert into about_story (id, title, paragraph_1, paragraph_2, image_url) values (
  1, 'Satu Gagasan Sederhana: Istirahat Lebih Baik untuk Keseharian',
  'Kumora didirikan pada tahun 2015 dengan gagasan sederhana: setiap orang berhak atas tempat istirahat yang nyaman. Apa yang dimulai sebagai koleksi kecil bantal sehari-hari perlahan berkembang menjadi rangkaian perlengkapan kamar yang lebih luas.',
  'Saat ini, Kumora menggabungkan bantal, kasur, seprai, dan aksesori kamar dalam satu merek, sambil tetap berpegang pada prinsip awal: menjadikan istirahat sehari-hari lebih baik.',
  null
) on conflict (id) do update set title = excluded.title, paragraph_1 = excluded.paragraph_1, paragraph_2 = excluded.paragraph_2;

insert into about_milestones_section (id, eyebrow, title) values (
  1, 'PERJALANAN KAMI', 'Pencapaian'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into about_milestones (counter_number, year, title, description, order_index) values
  (15, 2015, 'Kumora Didirikan', 'Kumora memulai perjalanan dengan koleksi perlengkapan tidur sehari-hari pertamanya.', 0),
  (18, 2018, 'Koleksi Bantal Pertama', 'Merek memperluas lini bantal dengan beberapa profil kenyamanan.', 1),
  (21, 2021, 'Memasuki Kamar Tidur', 'Kumora meluncurkan produk kasur dan perlengkapan tidur.', 2),
  (24, 2024, 'Koleksi Kamar Lengkap', 'Portofolio produk berkembang menjadi koleksi perlengkapan kamar yang lengkap.', 3),
  (26, 2026, 'Tumbuh Bersama Anda', 'Kumora mulai memperluas kehadiran digital dan pengalaman pelanggan.', 4);

insert into about_vision_mission (id, vision_label, vision_text, mission_label) values (
  1, 'VISI', 'Menjadi nama terpercaya dalam kenyamanan tidur dan kamar sehari-hari.', 'MISI'
) on conflict (id) do update set vision_text = excluded.vision_text;

insert into about_mission_items (text, order_index) values
  ('Menciptakan produk tidur yang nyaman dan dapat diandalkan.', 0),
  ('Terus meningkatkan bahan dan desain produk.', 1),
  ('Memberikan pengalaman pelanggan yang mudah dan personal.', 2),
  ('Membangun hubungan jangka panjang dengan pelanggan.', 3);

insert into about_values_section (id, eyebrow, title) values (
  1, 'YANG KAMI PEGANG', 'Nilai Utama'
) on conflict (id) do update set eyebrow = excluded.eyebrow, title = excluded.title;

insert into about_values (title, description, order_index) values
  ('KENYAMANAN', 'Kenyamanan adalah fondasi dari semua yang kami ciptakan.', 0),
  ('KUALITAS', 'Kami memperhatikan bahan, konstruksi, dan detail di balik setiap produk.', 1),
  ('KEPEDULIAN', 'Kami mendengarkan pelanggan dan merancang berdasarkan kebutuhan sehari-hari yang nyata.', 2),
  ('PERTUMBUHAN', 'Kami terus berkembang seiring perubahan gaya hidup, ekspektasi, dan teknologi.', 3);

insert into about_final_cta (id, title, subtitle, cta_text, cta_url) values (
  1, 'Jelajahi Koleksi Kumora', 'Temukan perlengkapan tidur dan kamar yang dirancang dengan penuh perhatian.',
  'Lihat Produk', '/shop/pillows'
) on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle, cta_text = excluded.cta_text;
