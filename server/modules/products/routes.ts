// Fase 3 — Routes Products CRUD (plan 3.1) + set-default variant (plan 3.3).
// Semua endpoint di bawah /api/admin/* wajib lewat middlewares/auth.ts.
import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { ok } from '../../utils/response';
import { ServiceError, mapDbError } from '../../utils/errors';
import {
  assertExactlyOneDefaultVariant,
  assertHasTextureImage,
  getProductOr404,
  isUuid,
  resolveSlug,
  slugify,
  validateProductPayload,
} from './service';
import { deleteImage, reorderImage, uploadImageHandler } from './images';

const router = Router();

// Kolom produk yang boleh di-set dari payload (whitelist).
const PRODUCT_FIELDS = [
  'name',
  'category',
  'tags',
  'price',
  'sensory_descriptor',
  'firmness_rating',
  'fill_material',
  'fill_weight_equivalent',
  'delivery_estimate',
  'return_policy_text',
  'gift_safe',
  'gift_safe_note',
  'brand_story_line',
  'description',
] as const;

function pickProductFields(payload: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of PRODUCT_FIELDS) {
    if (key in payload) out[key] = payload[key];
  }
  return out;
}

// GET /api/admin/products?category= — list semua produk (3.1)
router.get('/', async (req, res) => {
  const { category } = req.query;
  if (category !== undefined) {
    validateProductPayload({ category });
  }
  let query = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (typeof category === 'string' && category !== '') {
    query = query.eq('category', category);
  }
  const { data, error } = await query;
  if (error) throw mapDbError(error);
  return res.json(ok(data));
});

// GET /api/admin/products/:id — detail + images, variants, reviews (join)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*), product_variants(*), product_reviews(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
  return res.json(ok(data));
});

// POST /api/admin/products — create (3.2). Mendukung nested images/variants/reviews
// agar invariant 1.2 (texture image wajib, default variant wajib) bisa ditegakkan
// sejak produk lahir — tanpa ini, create tanpa gambar selalu melanggar aturan dan
// tidak akan pernah bisa berhasil (form admin Fase 7 mengirim semuanya sekaligus).
router.post('/', async (req, res) => {
  const payload: Record<string, any> = req.body ?? {};
  validateProductPayload(payload);

  const values = pickProductFields(payload);
  values.slug = await resolveSlug(payload.slug, payload.name);

  const { data: created, error } = await supabase
    .from('products')
    .insert(values)
    .select('*')
    .single();
  if (error) throw mapDbError(error);

  const productId = (created as any).id as string;

  try {
    const images = Array.isArray(payload.images) ? payload.images : [];
    const variants = Array.isArray(payload.variants) ? payload.variants : [];
    const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];

    if (images.length) {
      const rows = images.map((img: any, i: number) => ({
        product_id: productId,
        url: img.url,
        image_type: img.image_type,
        order_index: img.order_index ?? i,
      }));
      const { error: err } = await supabase.from('product_images').insert(rows);
      if (err) throw mapDbError(err);
    }
    if (variants.length) {
      const rows = variants.map((v: any) => ({
        product_id: productId,
        label: v.label,
        price: v.price,
        is_default: v.is_default ?? false,
      }));
      const { error: err } = await supabase.from('product_variants').insert(rows);
      if (err) throw mapDbError(err);
    }
    if (reviews.length) {
      const rows = reviews.map((r: any) => ({
        product_id: productId,
        author: r.author,
        rating: r.rating,
        comment: r.comment,
        sleep_position: r.sleep_position ?? null,
        body_type: r.body_type ?? null,
      }));
      const { error: err } = await supabase.from('product_reviews').insert(rows);
      if (err) throw mapDbError(err);
    }

    // Invariant 1.2 — ditegakkan sejak create (dibutuhkan untuk "hard reject" di Fase 7.4).
    await assertHasTextureImage(productId);
    await assertExactlyOneDefaultVariant(productId);

    return res.status(201).json(ok(created));
  } catch (err) {
    // Kompensasi: hapus produk yang baru dibuat (cascade membersihkan children)
    // supaya tidak ada produk setengah jadi yang melanggar invariant.
    await supabase.from('products').delete().eq('id', productId);
    throw err;
  }
});

// PATCH /api/admin/products/:id — update (3.2)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
  await getProductOr404(id);

  const payload: Record<string, any> = req.body ?? {};
  validateProductPayload(payload);
  const values = pickProductFields(payload);

  // Slug hanya berubah kalau explicitly disediakan (menghindari silent breaking change — Prinsip #6).
  if (typeof payload.slug === 'string' && payload.slug.trim() !== '') {
    const candidate = slugify(payload.slug);
    const { data: clash } = await supabase
      .from('products')
      .select('id, slug')
      .ilike('slug', candidate.replace(/[%_\\]/g, (m) => `\\${m}`))
      .neq('id', id);
    let finalSlug = candidate;
    const taken = new Set((clash ?? []).map((r: any) => String(r.slug).toLowerCase()));
    let n = 2;
    while (taken.has(finalSlug)) finalSlug = `${candidate}-${n++}`;
    values.slug = finalSlug;
  }

  if (Object.keys(values).length === 0) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'tidak ada field yang diupdate');
  }
  values.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('products')
    .update(values)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw mapDbError(error);

  // Invariant 1.2 tetap dicek setelah update (guard terhadap perubahan gift_safe dsb).
  await assertHasTextureImage(id);
  await assertExactlyOneDefaultVariant(id);

  return res.json(ok(data));
});

// DELETE /api/admin/products/:id — hapus produk (cascade ke images/variants/reviews)
// Fase 4.1: file di Storage ikut dihapus supaya tidak ada file orphan menumpuk di bucket.
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
  await getProductOr404(id);

  const { data: images } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', id);

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw mapDbError(error);

  const paths = (images ?? [])
    .map((r: any) => r.url)
    .map((url: string) => {
      const marker = `/object/public/product-images/`;
      const idx = url.indexOf(marker);
      return idx === -1 ? null : url.substring(idx + marker.length);
    })
    .filter((p): p is string => p !== null);
  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from('product-images').remove(paths);
    if (rmErr) throw new ServiceError(500, 'STORAGE_ERROR', rmErr.message);
  }

  return res.json(ok({ id, deleted: true }));
});

// Fase 4.1 — upload gambar produk: POST /api/admin/products/:id/images
router.post('/:id/images', ...uploadImageHandler);

// PATCH /api/admin/products/:id/variants/:variantId/set-default (3.3)
// Satu transaction via function SQL 0003: meng-unset default lain dan men-set
// target dalam satu statement UPDATE atomik.
router.patch('/:id/variants/:variantId/set-default', async (req, res) => {
  const { id, variantId } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
  if (!isUuid(variantId)) throw new ServiceError(404, 'NOT_FOUND', 'variant tidak ditemukan');

  const { data: variant, error: vErr } = await supabase
    .from('product_variants')
    .select('id, product_id')
    .eq('id', variantId)
    .maybeSingle();
  if (vErr) throw mapDbError(vErr);
  if (!variant || (variant as any).product_id !== id) {
    throw new ServiceError(404, 'NOT_FOUND', 'variant tidak ditemukan untuk produk ini');
  }

  const { error } = await supabase.rpc('set_default_variant', {
    p_product_id: id,
    p_variant_id: variantId,
  });
  if (error) throw mapDbError(error);

  const { data: variants, error: listErr } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('is_default', { ascending: false });
  if (listErr) throw mapDbError(listErr);

  return res.json(ok({ variants }));
});

export default router;
