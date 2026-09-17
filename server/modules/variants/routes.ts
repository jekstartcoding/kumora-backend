// Fase 4.2 — CRUD variant standalone (bukan cuma nested di product).
//   POST  /api/admin/variants        — create
//   PATCH /api/admin/variants/:id    — update (termasuk jadikan default via RPC transaksional)
//   DELETE /api/admin/variants/:id   — delete (tolak kalau menghapus default terakhir — 1.2 #2)
import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { ok } from '../../utils/response';
import { ServiceError, mapDbError } from '../../utils/errors';
import { assertExactlyOneDefaultVariant, isUuid } from '../products/service';

const router = Router();

// POST /api/admin/variants — body: product_id, label, price, is_default
router.post('/', async (req, res) => {
  const payload = req.body ?? {};
  const productId = payload.product_id;
  if (!isUuid(String(productId ?? ''))) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'product_id wajib berupa uuid produk yang valid');
  }
  if (typeof payload.label !== 'string' || payload.label.trim() === '') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'label wajib diisi');
  }
  const price = Number(payload.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'price harus angka >= 0');
  }

  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: productId,
      label: payload.label,
      price,
      is_default: payload.is_default === true,
    })
    .select('*')
    .single();
  if (error) throw mapDbError(error);

  if (payload.is_default === true) {
    // Unset default lain dalam satu statement atomik (RPC function 0003).
    const { error: rpcErr } = await supabase.rpc('set_default_variant', {
      p_product_id: productId,
      p_variant_id: (data as any).id,
    });
    if (rpcErr) throw mapDbError(rpcErr);
  }

  await assertExactlyOneDefaultVariant(productId);
  return res.status(201).json(ok(data));
});

// PATCH /api/admin/variants/:id — body: label?, price?, is_default?
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'variant tidak ditemukan');

  const { data: existing, error: fErr } = await supabase
    .from('product_variants')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fErr) throw mapDbError(fErr);
  if (!existing) throw new ServiceError(404, 'NOT_FOUND', 'variant tidak ditemukan');

  const productId = (existing as any).product_id as string;
  const payload = req.body ?? {};
  const values: Record<string, any> = {};

  if ('label' in payload) {
    if (typeof payload.label !== 'string' || payload.label.trim() === '') {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'label tidak boleh kosong');
    }
    values.label = payload.label;
  }
  if ('price' in payload) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'price harus angka >= 0');
    }
    values.price = price;
  }

  if (values && Object.keys(values).length) {
    const { error } = await supabase.from('product_variants').update(values).eq('id', id);
    if (error) throw mapDbError(error);
  }

  if (payload.is_default === true) {
    const { error: rpcErr } = await supabase.rpc('set_default_variant', {
      p_product_id: productId,
      p_variant_id: id,
    });
    if (rpcErr) throw mapDbError(rpcErr);
  }

  const { data: after, error: aErr } = await supabase
    .from('product_variants')
    .select('*')
    .eq('id', id)
    .single();
  if (aErr) throw mapDbError(aErr);

  await assertExactlyOneDefaultVariant(productId);
  return res.json(ok(after));
});

// DELETE /api/admin/variants/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'variant tidak ditemukan');

  const { data: existing, error: fErr } = await supabase
    .from('product_variants')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fErr) throw mapDbError(fErr);
  if (!existing) throw new ServiceError(404, 'NOT_FOUND', 'variant tidak ditemukan');

  const productId = (existing as any).product_id as string;
  const wasDefault = (existing as any).is_default === true;

  // 1.2 #2 — check-before-delete: tidak boleh menghapus satu-satunya variant default.
  if (wasDefault) {
    const { count, error: cErr } = await supabase
      .from('product_variants')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('is_default', true);
    if (cErr) throw mapDbError(cErr);
    if ((count ?? 0) <= 1) {
      throw new ServiceError(
        400,
        'DEFAULT_VARIANT_REQUIRED',
        'tidak boleh menghapus satu-satunya variant default'
      );
    }
  }

  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) throw mapDbError(error);

  return res.json(ok({ id, deleted: true, was_default: wasDefault }));
});

export default router;
