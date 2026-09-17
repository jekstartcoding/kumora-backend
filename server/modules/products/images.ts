// Fase 4.1 — Routes gambar produk (di dalam module products karena scoped ke produk):
//   POST  /api/admin/products/:id/images     — upload file → Supabase Storage → simpan URL
//   DELETE /api/admin/images/:imageId        — hapus record + file di Storage
//   PATCH  /api/admin/images/:imageId/reorder — update order_index
import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { ok } from '../../utils/response';
import { ServiceError, mapDbError } from '../../utils/errors';
import { assertHasTextureImage, getProductOr404, isUuid } from './service';
import { upload } from '../../middlewares/upload';

const BUCKET = 'product-images';

// Ekstrak path file dari URL publik Supabase Storage supaya file bisa dihapus.
function objectPathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

export const imagesRouter = Router();

// POST /api/admin/products/:id/images — multipart: file (wajib), image_type, order_index
export const uploadImageHandler = [
  upload.single('file'),
  async (req: any, res: any) => {
    const productId = req.params.id;
    if (!isUuid(productId)) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
    await getProductOr404(productId);

    const imageType = req.body?.image_type;
    if (imageType !== 'lifestyle' && imageType !== 'texture') {
      throw new ServiceError(400, 'INVALID_IMAGE_TYPE', "image_type harus 'lifestyle' atau 'texture'");
    }
    if (!req.file) {
      throw new ServiceError(400, 'FILE_REQUIRED', 'file gambar wajib dikirim pada field "file"');
    }

    const ext = req.file.originalname.includes('.')
      ? req.file.originalname.split('.').pop()!.toLowerCase()
      : 'bin';
    const objectPath = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });
    if (upErr) throw new ServiceError(500, 'STORAGE_ERROR', upErr.message);

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = publicUrlData.publicUrl;

    const { data, error } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        url: publicUrl,
        image_type: imageType,
        order_index: Number(req.body?.order_index ?? 0),
      })
      .select('*')
      .single();
    if (error) {
      // Record gagal tersimpan — hapus file yang sudah terlanjur masuk Storage.
      await supabase.storage.from(BUCKET).remove([objectPath]);
      throw mapDbError(error);
    }

    // Setelah upload, produk harus tetap punya texture image (1.2 #1 tetap terjaga).
    return res.status(201).json(ok(data));
  },
];

// DELETE /api/admin/images/:imageId — hapus record + file di Storage (anti file orphan)
export async function deleteImage(req: any, res: any) {
  const { imageId } = req.params;
  if (!isUuid(imageId)) throw new ServiceError(404, 'NOT_FOUND', 'image tidak ditemukan');

  const { data: image, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('id', imageId)
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (!image) throw new ServiceError(404, 'NOT_FOUND', 'image tidak ditemukan');

  const productId = (image as any).product_id as string;

  // 1.2 #1 — check-before-delete: kalau ini satu-satunya texture image, tolak SEBELUM
  // mutasi apa pun supaya tidak ada record/file yatim akibat rollback.
  if ((image as any).image_type === 'texture') {
    const { count, error: cErr } = await supabase
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('image_type', 'texture');
    if (cErr) throw mapDbError(cErr);
    if ((count ?? 0) <= 1) {
      throw new ServiceError(
        400,
        'TEXTURE_IMAGE_REQUIRED',
        'produk minimal harus punya 1 texture image'
      );
    }
  }

  const { error: delErr } = await supabase.from('product_images').delete().eq('id', imageId);
  if (delErr) throw mapDbError(delErr);

  const objectPath = objectPathFromUrl((image as any).url);
  if (objectPath) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (rmErr) throw new ServiceError(500, 'STORAGE_ERROR', rmErr.message);
  }

  return res.json(ok({ id: imageId, deleted: true }));
}

// PATCH /api/admin/images/:imageId/reorder — update order_index
export async function reorderImage(req: any, res: any) {
  const { imageId } = req.params;
  if (!isUuid(imageId)) throw new ServiceError(404, 'NOT_FOUND', 'image tidak ditemukan');
  const orderIndex = Number(req.body?.order_index);
  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'order_index harus integer >= 0');
  }

  const { data, error } = await supabase
    .from('product_images')
    .update({ order_index: orderIndex })
    .eq('id', imageId)
    .select('*')
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'image tidak ditemukan');

  return res.json(ok(data));
}
