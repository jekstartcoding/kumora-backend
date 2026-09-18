// Fase 3 — Routes CMS (plan 3.1/3.2/3.4): 14 singleton (GET + PUT upsert id=1),
// 6 list (GET/POST/PATCH/DELETE + PATCH /reorder batch), plus category_content
// khusus (GET + PATCH /:category, 3 row tetap — tanpa create/delete).
// Semua di bawah requireAdmin (di-mount dari app.ts). Response envelope konsisten.
import { Router, type Request, type Response, type NextFunction } from 'express';
import { supabase } from '../../config/supabase';
import { ok } from '../../utils/response';
import { ServiceError, mapDbError } from '../../utils/errors';
import { CMS_SINGLETONS, CMS_LISTS, ctaUrlFieldsFor, type SingletonDef, type ListDef } from './registry';

const router = Router();

function pickFields(payload: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of fields) {
    if (key in payload) out[key] = payload[key];
  }
  return out;
}

// Validasi 3.4 — cta_*/link url: wajib non-kosong; path relatif (/...) atau URL
// lengkap http(s)://. Mencegah admin menyimpan URL rusak yang bikin CTA error.
function validateUrls(def: SingletonDef, body: Record<string, unknown>): void {
  for (const field of ctaUrlFieldsFor(def.fields)) {
    if (!(field in body)) continue;
    const value = body[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ServiceError(400, 'INVALID_URL', `${field} tidak boleh kosong`);
    }
    const v = value.trim();
    const isRelative = v.startsWith('/');
    const isFullUrl = /^https?:\/\//i.test(v);
    if (!isRelative && !isFullUrl) {
      throw new ServiceError(
        400,
        'INVALID_URL',
        `${field} harus path relatif (diawali "/") atau URL lengkap http(s):// — diterima: "${v}"`
      );
    }
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// ============ SINGLETON (plan 3.1) ============
// GET  /api/admin/cms/<slug>  — row id=1 (404 kalau belum ter-seed)
// PUT  /api/admin/cms/<slug>  — upsert id=1 (aman walau row belum ada)
for (const [slug, def] of Object.entries(CMS_SINGLETONS)) {
  router.get(`/${slug}`, async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabase.from(def.table).select('*').eq('id', 1).maybeSingle();
      if (error) throw mapDbError(error);
      if (!data) throw new ServiceError(404, 'NOT_FOUND', `Section "${def.table}" belum ter-seed (row id=1 tidak ada)`);
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  });

  router.put(`/${slug}`, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = pickFields(req.body as Record<string, unknown>, def.fields);
      validateUrls(def, body);
      // Upsert (bukan update) — tetap aman kalau singleton belum ke-seed.
      const { data, error } = await supabase
        .from(def.table)
        .upsert({ id: 1, ...body })
        .select()
        .single();
      if (error) throw mapDbError(error);
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  });
}

// ============ LIST / REPEATER (plan 3.2) ============
// GET    /api/admin/cms/<slug>          — list order by order_index
// POST   /api/admin/cms/<slug>          — create
// PATCH  /api/admin/cms/<slug>/reorder  — batch [{id, order_index}] (VALID dulu: tanpa duplikat)
// PATCH  /api/admin/cms/<slug>/:id      — update
// DELETE /api/admin/cms/<slug>/:id      — delete
// (reorder didaftarkan sebelum :id supaya tidak tertelan param)
for (const [slug, def] of Object.entries(CMS_LISTS)) {
  router.get(`/${slug}`, async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabase.from(def.table).select('*').order('order_index');
      if (error) throw mapDbError(error);
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  });

  router.post(`/${slug}`, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = pickFields(req.body as Record<string, unknown>, def.fields);
      // order_index default: taruh di paling belakang kalau tidak dikirim.
      if (!('order_index' in body)) {
        const { count } = await supabase.from(def.table).select('*', { count: 'exact', head: true });
        body.order_index = count ?? 0;
      }
      const { data, error } = await supabase.from(def.table).insert(body).select().single();
      if (error) throw mapDbError(error);
      return res.status(201).json(ok(data));
    } catch (err) {
      return next(err);
    }
  });

  if (def.reorderable) {
    router.patch(`/${slug}/reorder`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const items = (req.body as { items?: { id: string; order_index: number }[] }).items;
        if (!Array.isArray(items) || items.length === 0) {
          throw new ServiceError(400, 'INVALID_PAYLOAD', 'body harus { items: [{ id, order_index }, ...] }');
        }
        // Validasi 3.4: order_index tidak boleh ada duplikat dalam satu request.
        const seen = new Set<number>();
        for (const it of items) {
          if (!it || typeof it.id !== 'string' || !isUuid(it.id) || !Number.isInteger(it.order_index)) {
            throw new ServiceError(400, 'INVALID_PAYLOAD', 'tiap item butuh id (uuid) dan order_index (integer)');
          }
          if (seen.has(it.order_index)) {
            throw new ServiceError(400, 'DUPLICATE_ORDER', `order_index ${it.order_index} duplikat dalam satu request`);
          }
          seen.add(it.order_index);
        }
        // Update batch — satu request per item ke PostgREST, tapi dijalankan Promise.all
        // dengan validasi id; kegagalan mana pun membatalkan response sukses.
        const results = await Promise.all(
          items.map((it) => supabase.from(def.table).update({ order_index: it.order_index }).eq('id', it.id).select('id'))
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw mapDbError(failed.error);
        const updated = results.reduce<number>((acc, r) => acc + (r.data?.length ?? 0), 0);
        if (updated !== items.length) {
          throw new ServiceError(404, 'NOT_FOUND', `beberapa id tidak ditemukan (terupdate ${updated}/${items.length})`);
        }
        return res.json(ok({ updated }));
      } catch (err) {
        return next(err);
      }
    });
  }

  router.patch(`/${slug}/:id`, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      if (!isUuid(id)) throw new ServiceError(400, 'INVALID_FORMAT', 'id harus uuid');
      const body = pickFields(req.body as Record<string, unknown>, def.fields);
      // maybeSingle: update yang match 0 row mengembalikan null → 404 (bukan error DB).
      const { data, error } = await supabase.from(def.table).update(body).eq('id', id).select().maybeSingle();
      if (error) throw mapDbError(error);
      if (!data) throw new ServiceError(404, 'NOT_FOUND', 'row tidak ditemukan');
      return res.json(ok(data));
    } catch (err) {
      return next(err);
    }
  });

  router.delete(`/${slug}/:id`, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      if (!isUuid(id)) throw new ServiceError(400, 'INVALID_FORMAT', 'id harus uuid');
      const { data, error } = await supabase.from(def.table).delete().eq('id', id).select('id');
      if (error) throw mapDbError(error);
      if (!data || data.length === 0) throw new ServiceError(404, 'NOT_FOUND', 'row tidak ditemukan');
      return res.json(ok({ deleted: id }));
    } catch (err) {
      return next(err);
    }
  });
}

// ============ CATEGORY_CONTENT (plan 3.2 kasus khusus) ============
// GET   /api/admin/cms/category-content              — 3 row (pillows/bolsters/beds)
// PATCH /api/admin/cms/category-content/:category    — update 1 kategori
const CATEGORY_FIELDS = ['display_name', 'description', 'tile_image_url', 'link_text'];
const VALID_CATEGORIES = ['pillows', 'bolsters', 'beds'] as const;

router.get('/category-content', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase.from('category_content').select('*');
    if (error) throw mapDbError(error);
    const ordered = VALID_CATEGORIES.map((c) => data.find((row: { category: string }) => row.category === c)).filter(Boolean);
    return res.json(ok(ordered));
  } catch (err) {
    return next(err);
  }
});

router.patch('/category-content/:category', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = String(req.params.category);
    if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      throw new ServiceError(400, 'INVALID_CATEGORY', 'category harus salah satu dari: pillows, bolsters, beds');
    }
    const body = pickFields(req.body as Record<string, unknown>, CATEGORY_FIELDS);
    const { data, error } = await supabase.from('category_content').update(body).eq('category', category).select().maybeSingle();
    if (error) throw mapDbError(error);
    if (!data) throw new ServiceError(404, 'NOT_FOUND', 'kategori tidak ditemukan');
    return res.json(ok(data));
  } catch (err) {
    return next(err);
  }
});

export default router;
