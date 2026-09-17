// Fase 4.2 — CRUD review standalone.
//   POST  /api/admin/reviews        — create
//   PATCH /api/admin/reviews/:id    — update
//   DELETE /api/admin/reviews/:id   — delete
import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { ok } from '../../utils/response';
import { ServiceError, mapDbError } from '../../utils/errors';
import { isUuid } from '../products/service';

const router = Router();

const SLEEP_POSITIONS = ['Terlentang', 'Menyamping', 'Tengkurap'];
const BODY_TYPES = ['Ringan', 'Sedang', 'Berat'];

function validateReviewPayload(payload: Record<string, any>, partial = false): Record<string, any> {
  const values: Record<string, any> = {};

  if (!partial || 'product_id' in payload) {
    if (!isUuid(String(payload.product_id ?? ''))) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'product_id wajib berupa uuid produk yang valid');
    }
    values.product_id = payload.product_id;
  }
  if (!partial || 'author' in payload) {
    if (typeof payload.author !== 'string' || payload.author.trim() === '') {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'author wajib diisi');
    }
    values.author = payload.author;
  }
  if (!partial || 'rating' in payload) {
    const rating = Number(payload.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ServiceError(400, 'INVALID_RATING', 'rating harus integer 1-5');
    }
    values.rating = rating;
  }
  if (!partial || 'comment' in payload) {
    if (typeof payload.comment !== 'string' || payload.comment.trim() === '') {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'comment wajib diisi');
    }
    values.comment = payload.comment;
  }
  if ('sleep_position' in payload) {
    if (payload.sleep_position !== null && !SLEEP_POSITIONS.includes(payload.sleep_position)) {
      throw new ServiceError(400, 'INVALID_SLEEP_POSITION', `sleep_position harus salah satu dari ${SLEEP_POSITIONS.join(', ')}`);
    }
    values.sleep_position = payload.sleep_position ?? null;
  }
  if ('body_type' in payload) {
    if (payload.body_type !== null && !BODY_TYPES.includes(payload.body_type)) {
      throw new ServiceError(400, 'INVALID_BODY_TYPE', `body_type harus salah satu dari ${BODY_TYPES.join(', ')}`);
    }
    values.body_type = payload.body_type ?? null;
  }
  return values;
}

// POST /api/admin/reviews
router.post('/', async (req, res) => {
  const values = validateReviewPayload(req.body ?? {});

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', values.product_id)
    .maybeSingle();
  if (!product) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');

  const { data, error } = await supabase.from('product_reviews').insert(values).select('*').single();
  if (error) throw mapDbError(error);
  return res.status(201).json(ok(data));
});

// PATCH /api/admin/reviews/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'review tidak ditemukan');

  const values = validateReviewPayload(req.body ?? {}, true);
  if (!Object.keys(values).length) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'tidak ada field yang diupdate');
  }

  const { data, error } = await supabase
    .from('product_reviews')
    .update(values)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'review tidak ditemukan');
  return res.json(ok(data));
});

// DELETE /api/admin/reviews/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'review tidak ditemukan');

  const { data, error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'review tidak ditemukan');
  return res.json(ok({ id, deleted: true }));
});

export default router;
