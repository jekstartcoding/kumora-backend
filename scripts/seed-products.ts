// Fase 9 — Seed data ASLI dari frontend customer (src/data/products.ts & src/data/quiz.ts).
// BUKAN data karangan: semua nama, harga, deskripsi, URL gambar, variant, dan review
// ditranskrip verbatim dari file statis frontend yang sudah diuji.
//
// Pemetaan field frontend → kolom DB (schema terkunci, tanpa kolom tambahan):
//   shortDescription  → TIDAK disimpan (di-derive frontend dari sensory_descriptor — keputusan user)
//   specifications    → TIDAK disimpan (tak pernah dipakai komponen UI mana pun)
//   rating/reviewCount→ TIDAK disimpan (dihitung frontend dari product_reviews live)
//   lifestyleImages   → product_images (image_type='lifestyle', order_index urut per tipe)
//   textureImages     → product_images (image_type='texture',  order_index urut per tipe)
//   images[]          → tidak disimpan; frontend menyusun ulang = lifestyle.concat(texture)
//   sensorySpec       → dipecah: firmness_rating, fill_material, fill_weight_equivalent
//
// Quiz: QUIZ_STEPS frontend (3 step × 3 opsi) + logika matchQuizToProduct direplikasi
// persis sebagai quiz_mappings: 26 kombinasi eksplisit + 1 fallback (kombinasi kosong
// = else-branch statis → kumora-cloud-pillow).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SECRET_KEY as string,
  { auth: { persistSession: false } },
);

// ===== URL gambar asli frontend (verbatim) =====
const pillowImg1 = 'https://images.pexels.com/photos/10061393/pexels-photo-10061393.jpeg?auto=compress&cs=tinysrgb&w=1200';
const pillowImg2 = 'https://images.pexels.com/photos/4153160/pexels-photo-4153160.jpeg?auto=compress&cs=tinysrgb&w=1200';
const pillowImg3 = 'https://images.pexels.com/photos/12200060/pexels-photo-12200060.jpeg?auto=compress&cs=tinysrgb&w=1200';
const pillowImg4 = 'https://images.pexels.com/photos/15410912/pexels-photo-15410912.jpeg?auto=compress&cs=tinysrgb&w=1200';
const mattressImg1 = 'https://images.pexels.com/photos/6207458/pexels-photo-6207458.jpeg?auto=compress&cs=tinysrgb&w=1200';
const mattressImg2 = 'https://images.pexels.com/photos/10600090/pexels-photo-10600090.jpeg?auto=compress&cs=tinysrgb&w=1200';
const mattressImg3 = 'https://images.pexels.com/photos/24904026/pexels-photo-24904026.jpeg?auto=compress&cs=tinysrgb&w=1200';
const mattressImg4 = 'https://images.pexels.com/photos/3847591/pexels-photo-3847591.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bedCoverImg1 = 'https://images.pexels.com/photos/30618181/pexels-photo-30618181.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bedCoverImg2 = 'https://images.pexels.com/photos/6123227/pexels-photo-6123227.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bedCoverImg3 = 'https://images.pexels.com/photos/16648303/pexels-photo-16648303.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bedsheetImg1 = 'https://images.pexels.com/photos/27671434/pexels-photo-27671434.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bedsheetImg2 = 'https://images.pexels.com/photos/28513848/pexels-photo-28513848.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bedsheetImg3 = 'https://images.pexels.com/photos/12553184/pexels-photo-12553184.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bedsheetImg4 = 'https://images.pexels.com/photos/22711513/pexels-photo-22711513.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bolsterImg1 = 'https://images.pexels.com/photos/28345543/pexels-photo-28345543.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bolsterImg2 = 'https://images.pexels.com/photos/18084887/pexels-photo-18084887.jpeg?auto=compress&cs=tinysrgb&w=1200';
const bolsterImg3 = 'https://images.pexels.com/photos/5825584/pexels-photo-5825584.jpeg?auto=compress&cs=tinysrgb&w=1200';

interface SeedProduct {
  slug: string;
  name: string;
  category: 'pillows' | 'bolsters' | 'beds';
  tags: string[];
  price: number;
  sensory_descriptor: string;
  firmness_rating: number;
  fill_material: string;
  fill_weight_equivalent: string;
  delivery_estimate: string;
  return_policy_text: string;
  gift_safe: boolean;
  gift_safe_note: string | null;
  brand_story_line: string;
  description: string;
  lifestyle: string[];
  texture: string[];
  variants: { label: string; price: number; is_default: boolean }[];
  reviews: {
    author: string;
    rating: number;
    comment: string;
    sleep_position: string | null;
    body_type: string | null;
  }[];
}

// ===== 12 produk asli (verbatim dari products.ts) =====
const PRODUCTS: SeedProduct[] = [
  {
    slug: 'kumora-cloud-pillow',
    name: 'Kumora Bantal Cloud',
    category: 'pillows',
    tags: [],
    price: 249000,
    sensory_descriptor: 'Memory foam yang lembut dengan sirkulasi udara optimal untuk kenyamanan sepanjang malam tanpa panas berlebih.',
    firmness_rating: 3,
    fill_material: 'Memory Foam',
    fill_weight_equivalent: '1,2kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 1 tahun terbatas untuk cacat fabrikasi.',
    gift_safe: true,
    gift_safe_note: 'Ukuran universal (60×40cm) cocok untuk hadiah',
    brand_story_line: 'Kenyamanan yang dimulai dari fondasi terbaik untuk setiap gaya tidur.',
    description:
      'Bantal Kumora Cloud menggabungkan memory foam responsif dengan sarung luar yang bernapas, memberikan pengalaman tidur yang lembut namun tetap menopang. Dirancang untuk kenyamanan sehari-hari tanpa terasa terlalu keras.',
    lifestyle: [pillowImg1, pillowImg2],
    texture: [pillowImg3, pillowImg4],
    variants: [
      { label: 'Firm — 60 × 40 × 12 cm', price: 249000, is_default: true },
      { label: 'Comfort — 60 × 40 × 12 cm', price: 269000, is_default: false },
    ],
    reviews: [
      { author: 'Andi Prasetyo', rating: 5, comment: 'Bantal ini sangat nyaman untuk tidur telentang. Tidak terlalu keras dan tidak terlalu lembut.', sleep_position: 'Terlentang', body_type: 'Ringan' },
      { author: 'Siti Rahayu', rating: 4, comment: 'Terasa cukup nyaman, tapi butuh adaptasi beberapa hari pertama.', sleep_position: 'Menyamping', body_type: 'Sedang' },
    ],
  },
  {
    slug: 'kumora-align-pillow',
    name: 'Kumora Bantal Align',
    category: 'pillows',
    tags: [],
    price: 299000,
    sensory_descriptor: 'Busa berkepadatan tinggi dengan ventilasi optimal untuk dukungan leher ergonomis tanpa panas berlebih.',
    firmness_rating: 4,
    fill_material: 'Busa berkepadatan tinggi',
    fill_weight_equivalent: '1,3kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 1 tahun terbatas untuk cacat fabrikasi.',
    gift_safe: true,
    gift_safe_note: 'Perbandingan dimensi universal (60×40cm)',
    brand_story_line: 'Dukungan ergonomis yang mengutamakan kesehatan tulang belakang.',
    description:
      'Bantal Kumora Align memberikan dukungan leher yang seimbang untuk posisi tidur yang lebih lurus. Dibuat dengan busa berkepadatan tinggi dan sarung campuran bambu yang nyaman dan bernapas.',
    lifestyle: [pillowImg1, pillowImg3],
    texture: [pillowImg2, pillowImg4],
    variants: [
      { label: 'Standard — 60 × 40 × 11 cm', price: 299000, is_default: true },
      { label: 'Premium — 60 × 40 × 11 cm', price: 349000, is_default: false },
    ],
    reviews: [
      { author: 'Budi Santoso', rating: 4, comment: 'Cukup nyaman untuk tidur samping, tapi butuh sedikit adaptasi.', sleep_position: 'Menyamping', body_type: 'Sedang' },
    ],
  },
  {
    slug: 'kumora-breeze-pillow',
    name: 'Kumora Bantal Breeze',
    category: 'pillows',
    tags: [],
    price: 219000,
    sensory_descriptor: 'Serat premium dengan katun bernapas untuk sirkulasi udara maksimal dan kenyamanan dingin sepanjang malam.',
    firmness_rating: 2,
    fill_material: 'Serat premium',
    fill_weight_equivalent: '0,9kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 6 bulan terbatas.',
    gift_safe: false,
    gift_safe_note: 'Ukuran tidak standard untuk hadiah',
    brand_story_line: 'Kenyamanan sederhana yang membuat Anda merasa sejuk.',
    description:
      'Bantal Kumora Breeze adalah bantal sehari-hari yang bernapas, dirancang untuk tidur yang lebih sejuk. Dibuat dengan serat premium dan katun bernapas untuk kenyamanan yang lembut dan udara yang mengalir.',
    lifestyle: [pillowImg2, pillowImg4],
    texture: [pillowImg1, pillowImg3],
    variants: [
      { label: 'Standard — 60 × 40 × 12 cm', price: 219000, is_default: true },
      { label: 'Light — 60 × 40 × 10 cm', price: 199000, is_default: false },
    ],
    reviews: [
      { author: 'Rina Wijaya', rating: 5, comment: 'Sangat cocok untuk yang tidak suka bantal terlalu keras. Terasa adem waktu tidur.', sleep_position: 'Tengkurap', body_type: 'Ringan' },
    ],
  },
  {
    slug: 'kumora-comfort-bolster',
    name: 'Kumora Guling Comfort',
    category: 'bolsters',
    tags: [],
    price: 179000,
    sensory_descriptor: 'Serat hollow yang lembut dan ringan dengan sentuhan katun yang menghangatkan.',
    firmness_rating: 2,
    fill_material: 'Serat Hollow',
    fill_weight_equivalent: '0,9kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 6 bulan terbatas.',
    gift_safe: true,
    gift_safe_note: 'Ukuran standard cocok untuk hadiah',
    brand_story_line: 'Kenyamanan tambahan yang melengkapi malam Anda.',
    description:
      'Guling Kumora Comfort adalah guling lembut sehari-hari untuk kenyamanan tidur tambahan. Diisi dengan serat hollow dan dibalut sarung campuran katun untuk sentuhan lembut yang menopang.',
    lifestyle: [bolsterImg1, bolsterImg2],
    texture: [bolsterImg3],
    variants: [
      { label: 'Standard — 90 × 20 cm', price: 179000, is_default: true },
      { label: 'Duo Set — 2 x 90 × 20 cm', price: 329000, is_default: false },
    ],
    reviews: [
      { author: 'Dewi Lestari', rating: 4, comment: 'Cukup nyaman untuk bacaan malam. Bentuknya bagus dan tidak terlalu besar.', sleep_position: 'Menyamping', body_type: 'Sedang' },
    ],
  },
  {
    slug: 'kumora-duo-bolster-set',
    name: 'Kumora Set Guling Duo',
    category: 'bolsters',
    tags: [],
    price: 299000,
    sensory_descriptor: 'Pasangan guling yang seimbang dengan isian serat premium dan sarung katun yang lembut.',
    firmness_rating: 2,
    fill_material: 'Serat Premium',
    fill_weight_equivalent: '1,8kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 6 bulan terbatas.',
    gift_safe: true,
    gift_safe_note: 'Set pasangan cocok untuk pasangan atau twin bed',
    brand_story_line: 'Perlengkapan tidur lengkap dalam satu set harmonis.',
    description:
      'Set Guling Duo Kumora adalah sepasang guling nyaman untuk perlengkapan tidur yang lebih lengkap. Isian serat premium dengan sarung campuran katun, dijual dalam satu set berisi dua buah.',
    lifestyle: [bolsterImg2, bolsterImg1],
    texture: [bolsterImg3],
    variants: [
      { label: 'Duo Set — 2 x 90 × 20 cm', price: 299000, is_default: true },
      { label: 'Single Set — 1 x 90 × 20 cm', price: 179000, is_default: false },
    ],
    reviews: [
      { author: 'Agus Priono', rating: 4, comment: 'Pas untuk kasur anak-anak di kamar anak. Nyaman dan tidak terlalu besar.', sleep_position: 'Tengkurap', body_type: 'Ringan' },
    ],
  },
  {
    slug: 'kumora-rest-mattress',
    name: 'Kumora Kasur Rest',
    category: 'beds',
    tags: [],
    price: 2499000,
    sensory_descriptor: 'Busa berkepadatan tinggi dengan struktur berlapis untuk dukungan optimal sepanjang malam.',
    firmness_rating: 3,
    fill_material: 'Busa berkepadatan tinggi',
    fill_weight_equivalent: '25kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 14 hari, garansi 5 tahun terbatas untuk kasur.',
    gift_safe: true,
    gift_safe_note: 'Ukuran standard cocok untuk hadiah pernikahan',
    brand_story_line: 'Dukungan kokoh yang menjadi dasar istirahat Anda.',
    description:
      'Kasur Kumora Rest menawarkan kenyamanan sedang-keras untuk dukungan seimbang dan malam yang nyenyak. Dibangun dengan busa berkepadatan tinggi dan sarung kain rajut untuk kenyamanan sehari-hari yang tahan lama.',
    lifestyle: [mattressImg1, mattressImg2],
    texture: [mattressImg3, mattressImg4],
    variants: [
      { label: 'Standard — 160 × 200 × 20 cm', price: 2499000, is_default: true },
      { label: 'King — 180 × 200 × 20 cm', price: 3199000, is_default: false },
    ],
    reviews: [
      { author: 'Siti Maryam', rating: 5, comment: 'Kasur ini sangat nyaman. Busa yang padat tapi tidak terlalu keras, cocok untuk semua posisi tidur.', sleep_position: 'Menyamping', body_type: 'Sedang' },
    ],
  },
  {
    slug: 'kumora-cloud-mattress',
    name: 'Kumora Kasur Cloud',
    category: 'beds',
    tags: [],
    price: 3499000,
    sensory_descriptor: 'Busa berlapis premium untuk kenyamanan lembut dan mewah yang mengelilingi Anda setiap malam.',
    firmness_rating: 2,
    fill_material: 'Busa multi-lapis',
    fill_weight_equivalent: '30kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 14 hari, garansi 8 tahun terbatas untuk kasur mewah.',
    gift_safe: true,
    gift_safe_note: 'Kasur mewah untuk hadiah istimewa',
    brand_story_line: 'Kemewahan dalam tidur yang membungkus Anda dalam kenyamanan.',
    description:
      'Kasur Kumora Cloud menghadirkan kenyamanan busa berlapis untuk tidur yang lebih lembut dan santai. Konstruksi multi-lapis dengan sarung rajut premium untuk sentuhan mewah.',
    lifestyle: [mattressImg3, mattressImg1],
    texture: [mattressImg4, mattressImg2],
    variants: [
      { label: 'Standard — 160 × 200 × 25 cm', price: 3499000, is_default: true },
      { label: 'Luxury — 180 × 200 × 25 cm', price: 4499000, is_default: false },
    ],
    reviews: [
      { author: 'Budi dan Ani', rating: 5, comment: 'Kasur ini sangat nyaman, cocok untuk berdua. Kami sangat puas!', sleep_position: 'Terlentang', body_type: 'Sedang' },
    ],
  },
  {
    slug: 'kumora-essential-mattress',
    name: 'Kumora Kasur Essential',
    category: 'beds',
    tags: [],
    price: 1899000,
    sensory_descriptor: 'Kenyamanan sehari-hari yang praktis dengan dukungan busa andal untuk tidur yang lebih baik setiap malam.',
    firmness_rating: 3,
    fill_material: 'Busa berkepadatan tinggi',
    fill_weight_equivalent: '15kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 3 tahun terbatas.',
    gift_safe: true,
    gift_safe_note: 'Cocok untuk hadiah hemat',
    brand_story_line: 'Kenyamanan praktis yang dapat diandalkan setiap hari.',
    description:
      'Kasur Kumora Essential memberikan kenyamanan sehari-hari yang praktis untuk tidur yang lebih baik. Kasur busa berkepadatan tinggi yang andal dengan sarung polyester untuk dukungan yang dapat diandalkan.',
    lifestyle: [mattressImg4, mattressImg1],
    texture: [mattressImg2, mattressImg3],
    variants: [
      { label: 'Standard — 120 × 200 × 18 cm', price: 1899000, is_default: true },
      { label: 'Large — 140 × 200 × 18 cm', price: 2299000, is_default: false },
    ],
    reviews: [
      { author: 'Triastuti', rating: 4, comment: 'Cukup nyaman, tidak terlalu mahal. Cocok untuk kos-kosan.', sleep_position: 'Tengkurap', body_type: 'Ringan' },
    ],
  },
  {
    slug: 'kumora-serenity-bed-cover',
    name: 'Kumora Seprai Penutup Serenity',
    category: 'beds',
    tags: ['cover'],
    price: 599000,
    sensory_descriptor: 'Seprai penutup katun premium dengan tekstur hangat yang sempurna untuk sentuhan akhir kamar.',
    firmness_rating: 1,
    fill_material: 'Campuran Katun',
    fill_weight_equivalent: '3kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 6 bulan terbatas.',
    gift_safe: true,
    gift_safe_note: 'Hadiah sempurna untuk rumah baru',
    brand_story_line: 'Sentuhan akhir yang menghadirkan kehangatan pada kamar Anda.',
    description:
      'Seprai Penutup Kumora Serenity adalah seprai penutup katun lembut dengan tekstur halus. Lapisan yang santai dan hangat, menghadirkan kehangatan dan kedalaman pada kamar Anda.',
    lifestyle: [bedCoverImg1, bedCoverImg2],
    texture: [bedCoverImg3],
    variants: [
      { label: 'Sage — 220 × 240 cm', price: 599000, is_default: true },
    ],
    reviews: [
      { author: 'Linda Hartini', rating: 4, comment: 'Bahan terasa bagus, tidak terlalu tebal. Cocok untuk hiasan kamar.', sleep_position: 'Tengkurap', body_type: 'Sedang' },
    ],
  },
  {
    slug: 'kumora-linen-bed-cover',
    name: 'Kumora Seprai Penutup Linen',
    category: 'beds',
    tags: ['cover'],
    price: 749000,
    sensory_descriptor: 'Linen ringan dengan tekstur natural yang menciptakan suasana santai dan hangat di kamar.',
    firmness_rating: 1,
    fill_material: 'Campuran Linen',
    fill_weight_equivalent: '2.5kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 6 bulan terbatas.',
    gift_safe: true,
    gift_safe_note: 'Cocok untuk hadiah estetika',
    brand_story_line: 'Linen santai yang membawa kehangatan alami ke kamar Anda.',
    description:
      'Seprai Penutup Kumora Linen adalah lapisan ringan bernuansa linen dengan estetika santai yang alami. Lembut, bernapas, dan elegan untuk pemakaian sehari-hari.',
    lifestyle: [bedCoverImg2, bedCoverImg1],
    texture: [bedCoverImg3],
    variants: [
      { label: 'Pasir — 220 × 240 cm', price: 749000, is_default: true },
    ],
    reviews: [
      { author: 'Rudi Hermawan', rating: 4, comment: 'Terasa premium untuk harga segini. Lembut dan tidak terlalu tebal.', sleep_position: 'Tengkurap', body_type: 'Sedang' },
    ],
  },
  {
    slug: 'kumora-everyday-bedsheet',
    name: 'Kumora Seprai Everyday',
    category: 'beds',
    tags: ['sheet'],
    price: 329000,
    sensory_descriptor: 'Katun bernapas yang lembut untuk kenyamanan sehari-hari tanpa mengorbankan kualitas.',
    firmness_rating: 2,
    fill_material: 'Campuran Katun',
    fill_weight_equivalent: '2kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 6 bulan terbatas.',
    gift_safe: true,
    gift_safe_note: 'Cocok untuk hadiah hemat',
    brand_story_line: 'Kenyamanan sederhana yang hadir setiap malam.',
    description:
      'Seprai Kumora Everyday adalah seprai lembut dan bernapas untuk pemakaian sehari-hari. Kain campuran katun dengan sentuhan nyaman dan warna putih hangat yang bersih.',
    lifestyle: [bedsheetImg2, bedsheetImg4],
    texture: [bedsheetImg1, bedsheetImg3],
    variants: [
      { label: 'King — 180 × 200 cm', price: 329000, is_default: true },
    ],
    reviews: [
      { author: 'Dewi Kurnia', rating: 4, comment: 'Terasa lembut dan nyaman. Warna putih yang bersih, kainnya bagus.', sleep_position: 'Menyamping', body_type: 'Sedang' },
    ],
  },
  {
    slug: 'kumora-signature-bedsheet',
    name: 'Kumora Seprai Signature',
    category: 'beds',
    tags: ['sheet'],
    price: 449000,
    sensory_descriptor: 'Katun premium dengan benang 400 untuk sentuhan mewah dan kenyamanan hotel yang halus.',
    firmness_rating: 2,
    fill_material: 'Katun Premium',
    fill_weight_equivalent: '2.5kg',
    delivery_estimate: '3-5 hari kerja (Jabodetabek)',
    return_policy_text: 'Masa percobaan 7 hari, garansi 6 bulan terbatas.',
    gift_safe: true,
    gift_safe_note: 'Hadiah mewah yang mengesankan',
    brand_story_line: 'Kemewahan hotel dalam kenyamanan seprai Anda.',
    description:
      'Seprai Kumora Signature adalah seprai halus dan premium terinspirasi dari kenyamanan hotel. Dibuat dengan katun premium dan jumlah benang 400 untuk sentuhan mewah yang halus.',
    lifestyle: [bedsheetImg1, bedsheetImg4],
    texture: [bedsheetImg2, bedsheetImg3],
    variants: [
      { label: 'Sage — 180 × 200 cm', price: 449000, is_default: true },
    ],
    reviews: [
      { author: 'Anita dan Budi', rating: 5, comment: 'Terasa seperti di hotel bintang lima. Kualitasnya luar biasa!', sleep_position: 'Terlentang', body_type: 'Sedang' },
    ],
  },
];

// ===== Quiz options asli (verbatim dari QUIZ_STEPS di quiz.ts) =====
const QUIZ_STEPS: { step_id: string; options: { option_id: string; label: string }[] }[] = [
  {
    step_id: 'sleep-position',
    options: [
      { option_id: 'back', label: 'Terlentang' },
      { option_id: 'side', label: 'Menyamping' },
      { option_id: 'stomach', label: 'Tengkurap' },
    ],
  },
  {
    step_id: 'firmness',
    options: [
      { option_id: 'soft', label: 'Lembut' },
      { option_id: 'medium', label: 'Seimbang' },
      { option_id: 'firm', label: 'Tegas' },
    ],
  },
  {
    step_id: 'category',
    options: [
      { option_id: 'pillow', label: 'Bantal' },
      { option_id: 'bolster', label: 'Guling' },
      { option_id: 'bed', label: 'Kasur' },
    ],
  },
];

// ===== Quiz mappings: replikasi PERSIS logika matchQuizToProduct statis =====
// if category === 'bolster' → firm===firm ? duo-bolster-set : comfort-bolster
// else if category === 'bed' → firm===soft ? cloud-mattress : rest-mattress
// else if position === 'side' || firmness === 'firm' → align-pillow
// else if position === 'stomach' || firmness === 'soft' → breeze-pillow
// else → cloud-pillow  (else-branch statis = fallback, kombinasi kosong)
function buildMappings(): { combination: Record<string, string>; slug: string; is_fallback: boolean }[] {
  const out: { combination: Record<string, string>; slug: string; is_fallback: boolean }[] = [];
  for (const category of ['pillow', 'bolster', 'bed']) {
    for (const position of ['back', 'side', 'stomach']) {
      for (const firmness of ['soft', 'medium', 'firm']) {
        let slug: string;
        let fallback = false;
        if (category === 'bolster') {
          slug = firmness === 'firm' ? 'kumora-duo-bolster-set' : 'kumora-comfort-bolster';
        } else if (category === 'bed') {
          slug = firmness === 'soft' ? 'kumora-cloud-mattress' : 'kumora-rest-mattress';
        } else if (position === 'side' || firmness === 'firm') {
          slug = 'kumora-align-pillow';
        } else if (position === 'stomach' || firmness === 'soft') {
          slug = 'kumora-breeze-pillow';
        } else {
          slug = 'kumora-cloud-pillow';
          fallback = true; // else-branch statis → jadi fallback (kombinasi kosong)
        }
        const combination = fallback
          ? {}
          : { category, 'sleep-position': position, firmness };
        out.push({ combination, slug, is_fallback: fallback });
      }
    }
  }
  return out;
}

async function main() {
  console.log('=== Seed Fase 9: data asli frontend ===');

  // --- 0. kondisi awal ---
  for (const t of ['products', 'quiz_options', 'quiz_mappings']) {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`table ${t}: ${count} rows`);
  }

  // --- 1. produk: skip yang slug-nya sudah ada, insert sisanya (dulu — mappings butuh product_id) ---
  const { data: existing } = await sb.from('products').select('id, slug');
  const slugToId = new Map((existing ?? []).map((p: any) => [p.slug, p.id]));

  let created = 0;
  for (const p of PRODUCTS) {
    if (slugToId.has(p.slug)) {
      console.log(`skip (sudah ada): ${p.slug}`);
      continue;
    }

    const values = {
      slug: p.slug,
      name: p.name,
      category: p.category,
      tags: p.tags,
      price: p.price,
      sensory_descriptor: p.sensory_descriptor,
      firmness_rating: p.firmness_rating,
      fill_material: p.fill_material,
      fill_weight_equivalent: p.fill_weight_equivalent,
      delivery_estimate: p.delivery_estimate,
      return_policy_text: p.return_policy_text,
      gift_safe: p.gift_safe,
      gift_safe_note: p.gift_safe_note,
      brand_story_line: p.brand_story_line,
      description: p.description,
    };
    const { data: created_, error } = await sb.from('products').insert(values).select('id').single();
    if (error) throw error;
    const productId = (created_ as any).id as string;

    // images: lifestyle dulu lalu texture, order_index urut per tipe —
    // frontend menyusun images = lifestyle.concat(texture) sesuai array asli
    const imageRows = [
      ...p.lifestyle.map((url, i) => ({ product_id: productId, url, image_type: 'lifestyle' as const, order_index: i })),
      ...p.texture.map((url, i) => ({ product_id: productId, url, image_type: 'texture' as const, order_index: i })),
    ];
    const { error: eImg } = await sb.from('product_images').insert(imageRows);
    if (eImg) throw eImg;

    const variantRows = p.variants.map((v) => ({ product_id: productId, ...v }));
    const { error: eVar } = await sb.from('product_variants').insert(variantRows);
    if (eVar) throw eVar;

    const reviewRows = p.reviews.map((r) => ({ product_id: productId, ...r }));
    if (reviewRows.length) {
      const { error: eRev } = await sb.from('product_reviews').insert(reviewRows);
      if (eRev) throw eRev;
    }
    created++;
    console.log(`created: ${p.slug} (${imageRows.length} images, ${variantRows.length} variants, ${reviewRows.length} reviews)`);
  }

  // --- 2. quiz: bersihkan, insert options, lalu mappings (slugToId kini lengkap termasuk produk baru) ---
  const { data: allProds } = await sb.from('products').select('id, slug');
  for (const p of allProds ?? []) slugToId.set((p as any).slug, (p as any).id);

  const { error: eQm } = await sb.from('quiz_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (eQm) throw eQm;
  const { error: eQo } = await sb.from('quiz_options').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (eQo) throw eQo;

  const optionRows = QUIZ_STEPS.flatMap((step, si) =>
    step.options.map((o, oi) => ({
      step_id: step.step_id,
      option_id: o.option_id,
      label: o.label,
      order_index: si * 10 + oi,
    })),
  );
  const { error: eOpt } = await sb.from('quiz_options').insert(optionRows);
  if (eOpt) throw eOpt;
  console.log(`quiz_options inserted: ${optionRows.length}`);

  const mappingRows = buildMappings().map((m) => ({
    answer_combination: m.combination,
    product_id: slugToId.get(m.slug) ?? null,
    is_fallback: m.is_fallback,
  }));
  const missing = mappingRows.filter((m) => m.product_id === null && m.is_fallback === false);
  if (missing.length) throw new Error(`${missing.length} mapping menunjuk slug yang belum ada — seed produk dulu`);
  const { error: eMap } = await sb.from('quiz_mappings').insert(mappingRows);
  if (eMap) throw eMap;
  console.log(`quiz_mappings inserted: ${mappingRows.length} (fallback: ${mappingRows.filter((m) => m.is_fallback).length})`);

  const { count: cProd } = await sb.from('products').select('*', { count: 'exact', head: true });
  const { count: cImg } = await sb.from('product_images').select('*', { count: 'exact', head: true });
  const { count: cVar } = await sb.from('product_variants').select('*', { count: 'exact', head: true });
  const { count: cRev } = await sb.from('product_reviews').select('*', { count: 'exact', head: true });
  const { count: cOpt } = await sb.from('quiz_options').select('*', { count: 'exact', head: true });
  const { count: cMap } = await sb.from('quiz_mappings').select('*', { count: 'exact', head: true });
  console.log('=== Selesai ===');
  console.log(`products: ${cProd} | images: ${cImg} | variants: ${cVar} | reviews: ${cRev}`);
  console.log(`quiz_options: ${cOpt} | quiz_mappings: ${cMap}`);
  console.log(`produk baru dibuat: ${created}`);
}

main().catch((e) => {
  console.error('SEED GAGAL:', e);
  process.exit(1);
});
