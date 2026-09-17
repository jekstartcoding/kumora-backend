// Fase 3 — Module Products: service layer dengan validasi bisnis dari plan 1.2 & 3.2.
// Backend adalah tempat logic bisnis hidup (Prinsip Kerja #3) — bukan sekadar proxy CRUD.
import { supabase } from '../../config/supabase';
import { ServiceError } from '../../utils/errors';

export const CATEGORIES = ['pillows', 'bolsters', 'beds'] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProductRow = Record<string, any>;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 3.2 — slug otomatis dari name kalau tidak disediakan eksplisit; cek uniqueness,
// kalau bentrok tambahkan suffix angka (-2, -3, ...).
export async function resolveSlug(explicit?: unknown, name?: unknown): Promise<string> {
  let slug: string;
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    slug = slugify(explicit);
  } else if (typeof name === 'string' && name.trim() !== '') {
    slug = slugify(name);
  } else {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'name atau slug wajib diisi');
  }
  if (slug === '') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'slug tidak valid setelah dinormalisasi');
  }

  const esc = slug.replace(/[%_\\]/g, (m) => `\\${m}`);
  // Cocokkan slug persis DAN varian ber-suffix (slug-2, slug-3, ...) supaya
  // suffix tidak pernah bentrok (bug terdeteksi saat uji Fase 3: ilike persis
  // melewatkan slug-2 yang sudah ada dan menghasilkan 409 duplicate).
  const { data, error } = await supabase
    .from('products')
    .select('slug')
    .or(`slug.ilike.${esc},slug.ilike.${esc}-%`);
  if (error) throw new ServiceError(500, 'DB_ERROR', error.message);
  const taken = new Set((data ?? []).map((r: any) => String(r.slug).toLowerCase()));
  if (!taken.has(slug.toLowerCase())) return slug;

  let n = 2;
  while (taken.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

// 3.2 + 1.2 #3 — validasi conditional payload produk.
export function validateProductPayload(payload: Record<string, any>): void {
  if ('category' in payload && !CATEGORIES.includes(payload.category)) {
    throw new ServiceError(
      400,
      'INVALID_CATEGORY',
      "category harus salah satu dari 'pillows', 'bolsters', 'beds'"
    );
  }
  if ('firmness_rating' in payload) {
    const v = Number(payload.firmness_rating);
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      throw new ServiceError(400, 'INVALID_FIRMNESS', 'firmness_rating harus integer 1-5');
    }
  }
  if ('gift_safe' in payload && payload.gift_safe === true) {
    const note = payload.gift_safe_note;
    if (typeof note !== 'string' || note.trim() === '') {
      throw new ServiceError(
        400,
        'GIFT_SAFE_NOTE_REQUIRED',
        'gift_safe_note wajib diisi kalau gift_safe true'
      );
    }
  }
}

// 1.2 #1 — setiap produk minimal 1 row product_images dengan image_type = 'texture'.
export async function assertHasTextureImage(productId: string): Promise<void> {
  const { count, error } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('image_type', 'texture');
  if (error) throw new ServiceError(500, 'DB_ERROR', error.message);
  if (!count) {
    throw new ServiceError(400, 'TEXTURE_IMAGE_REQUIRED', 'produk minimal harus punya 1 texture image');
  }
}

// 1.2 #2 — setiap produk minimal 1 variant default, dan hanya boleh 1.
export async function assertExactlyOneDefaultVariant(productId: string): Promise<void> {
  const { count, error } = await supabase
    .from('product_variants')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('is_default', true);
  if (error) throw new ServiceError(500, 'DB_ERROR', error.message);
  if (!count) {
    throw new ServiceError(400, 'DEFAULT_VARIANT_REQUIRED', 'produk minimal harus punya 1 variant default');
  }
}

export async function getProductOr404(id: string): Promise<ProductRow> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw new ServiceError(500, 'DB_ERROR', error.message);
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
  return data as ProductRow;
}
