// Fase 4.3 — Quiz Options & Quiz Mappings.
//   GET/POST/PATCH/DELETE /api/admin/quiz-options
//   GET/POST/PATCH/DELETE /api/admin/quiz-mappings
// Validasi kritis: minimal 1 row quiz_mappings dengan is_fallback = true harus
// selalu ada — delete fallback terakhir dan uncheck fallback terakhir ditolak.
import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { ok } from '../../utils/response';
import { ServiceError, mapDbError } from '../../utils/errors';
import { isUuid } from '../products/service';

const FALLBACK_REQUIRED_MSG = 'minimal harus ada 1 fallback mapping';

async function countFallbacks(): Promise<number> {
  const { count, error } = await supabase
    .from('quiz_mappings')
    .select('id', { count: 'exact', head: true })
    .eq('is_fallback', true);
  if (error) throw mapDbError(error);
  return count ?? 0;
}

const optionRouter = Router();

// GET /api/admin/quiz-options
optionRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('quiz_options')
    .select('*')
    .order('step_id')
    .order('order_index');
  if (error) throw mapDbError(error);
  return res.json(ok(data));
});

// POST /api/admin/quiz-options — body: step_id, option_id, label, order_index?
optionRouter.post('/', async (req, res) => {
  const payload = req.body ?? {};
  for (const field of ['step_id', 'option_id', 'label'] as const) {
    if (typeof payload[field] !== 'string' || payload[field].trim() === '') {
      throw new ServiceError(400, 'VALIDATION_ERROR', `${field} wajib diisi`);
    }
  }
  const values: Record<string, any> = {
    step_id: payload.step_id.trim(),
    option_id: payload.option_id.trim(),
    label: payload.label,
  };
  if ('order_index' in payload) {
    const oi = Number(payload.order_index);
    if (!Number.isInteger(oi) || oi < 0) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'order_index harus integer >= 0');
    }
    values.order_index = oi;
  }

  const { data, error } = await supabase.from('quiz_options').insert(values).select('*').single();
  if (error) throw mapDbError(error);
  return res.status(201).json(ok(data));
});

// PATCH /api/admin/quiz-options/:id
optionRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'quiz option tidak ditemukan');

  const payload = req.body ?? {};
  const values: Record<string, any> = {};
  for (const field of ['step_id', 'option_id', 'label'] as const) {
    if (field in payload) {
      if (typeof payload[field] !== 'string' || payload[field].trim() === '') {
        throw new ServiceError(400, 'VALIDATION_ERROR', `${field} tidak boleh kosong`);
      }
      values[field] = payload[field].trim();
    }
  }
  if ('order_index' in payload) {
    const oi = Number(payload.order_index);
    if (!Number.isInteger(oi) || oi < 0) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'order_index harus integer >= 0');
    }
    values.order_index = oi;
  }
  if (!Object.keys(values).length) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'tidak ada field yang diupdate');
  }

  const { data, error } = await supabase
    .from('quiz_options')
    .update(values)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'quiz option tidak ditemukan');
  return res.json(ok(data));
});

// DELETE /api/admin/quiz-options/:id
optionRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'quiz option tidak ditemukan');

  const { data, error } = await supabase
    .from('quiz_options')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'quiz option tidak ditemukan');
  return res.json(ok({ id, deleted: true }));
});

const mappingRouter = Router();

// GET /api/admin/quiz-mappings
mappingRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('quiz_mappings')
    .select('*, products(id, name, slug)')
    .order('is_fallback');
  if (error) throw mapDbError(error);
  return res.json(ok(data));
});

function validateAnswerCombination(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'answer_combination wajib object {step_id: option_id}');
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof k !== 'string' || k.trim() === '' || typeof v !== 'string' || v.trim() === '') {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'answer_combination harus object berisi pasangan string {step_id: option_id}');
    }
    out[k] = v;
  }
  if (!Object.keys(out).length) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'answer_combination tidak boleh kosong');
  }
  return out;
}

// POST /api/admin/quiz-mappings — body: answer_combination, product_id?, is_fallback?
mappingRouter.post('/', async (req, res) => {
  const payload = req.body ?? {};
  const answerCombination = validateAnswerCombination(payload.answer_combination);

  const values: Record<string, any> = {
    answer_combination: answerCombination,
    is_fallback: payload.is_fallback === true,
  };
  if (payload.product_id !== undefined && payload.product_id !== null) {
    if (!isUuid(String(payload.product_id))) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'product_id wajib berupa uuid produk yang valid');
    }
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', payload.product_id)
      .maybeSingle();
    if (!product) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
    values.product_id = payload.product_id;
  }

  const { data, error } = await supabase.from('quiz_mappings').insert(values).select('*').single();
  if (error) throw mapDbError(error);
  return res.status(201).json(ok(data));
});

// PATCH /api/admin/quiz-mappings/:id — body: answer_combination?, product_id?, is_fallback?
mappingRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'quiz mapping tidak ditemukan');

  const { data: existing, error: fErr } = await supabase
    .from('quiz_mappings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fErr) throw mapDbError(fErr);
  if (!existing) throw new ServiceError(404, 'NOT_FOUND', 'quiz mapping tidak ditemukan');

  const payload = req.body ?? {};
  const values: Record<string, any> = {};

  if ('answer_combination' in payload) {
    values.answer_combination = validateAnswerCombination(payload.answer_combination);
  }
  if ('product_id' in payload) {
    if (payload.product_id === null) {
      values.product_id = null;
    } else {
      if (!isUuid(String(payload.product_id))) {
        throw new ServiceError(400, 'VALIDATION_ERROR', 'product_id wajib berupa uuid produk yang valid');
      }
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', payload.product_id)
        .maybeSingle();
      if (!product) throw new ServiceError(404, 'NOT_FOUND', 'produk tidak ditemukan');
      values.product_id = payload.product_id;
    }
  }

  const wasFallback = (existing as any).is_fallback === true;
  const willBeFallback = 'is_fallback' in payload ? payload.is_fallback === true : wasFallback;
  values.is_fallback = willBeFallback;

  // Validasi kritis 4.3 — uncheck fallback pada SATU-SATUNYA fallback yang ada ditolak.
  if (wasFallback && !willBeFallback) {
    const fallbacks = await countFallbacks();
    if (fallbacks <= 1) {
      throw new ServiceError(400, 'FALLBACK_REQUIRED', FALLBACK_REQUIRED_MSG);
    }
  }

  const { data, error } = await supabase
    .from('quiz_mappings')
    .update(values)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw mapDbError(error);
  return res.json(ok(data));
});

// DELETE /api/admin/quiz-mappings/:id
mappingRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw new ServiceError(404, 'NOT_FOUND', 'quiz mapping tidak ditemukan');

  const { data: existing, error: fErr } = await supabase
    .from('quiz_mappings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fErr) throw mapDbError(fErr);
  if (!existing) throw new ServiceError(404, 'NOT_FOUND', 'quiz mapping tidak ditemukan');

  // Validasi kritis 4.3 — sebelum izinkan hapus row fallback, cek apakah itu
  // satu-satunya fallback yang ada; kalau ya, tolak (400).
  if ((existing as any).is_fallback === true) {
    const fallbacks = await countFallbacks();
    if (fallbacks <= 1) {
      throw new ServiceError(400, 'FALLBACK_REQUIRED', FALLBACK_REQUIRED_MSG);
    }
  }

  const { error } = await supabase.from('quiz_mappings').delete().eq('id', id);
  if (error) throw mapDbError(error);
  return res.json(ok({ id, deleted: true }));
});

// Fase 4.3 — endpoint plan: /api/admin/quiz-options dan /api/admin/quiz-mappings
// (masing-masing di-mount langsung di app.ts).
export { optionRouter, mappingRouter };
