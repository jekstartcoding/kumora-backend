// Fase 7 — Form view Products (7.2) dengan validasi mirror backend (7.3).
// Section: Basic Info, Sensory Spec, Logistics, Gift, Images, Variants, Reviews.
// Backend tetap sumber kebenaran akhir — validasi di sini hanya untuk feedback instan.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ResourceForm from '../../components/ResourceForm';
import ImageUploader, { type AdminImage } from '../../components/ImageUploader';
import { apiGet, apiSend, apiErrorMessage } from '../../lib/apiClient';
import type { AdminReview, AdminVariant, ProductRow } from './types';

const CATEGORY_OPTIONS = [
  { value: 'pillows', label: 'Pillows' },
  { value: 'bolsters', label: 'Bolsters' },
  { value: 'beds', label: 'Beds' },
];

const SLEEP_POSITION_OPTIONS = [
  { value: 'Terlentang', label: 'Terlentang' },
  { value: 'Menyamping', label: 'Menyamping' },
  { value: 'Tengkurap', label: 'Tengkurap' },
];

const BODY_TYPE_OPTIONS = [
  { value: 'Ringan', label: 'Ringan' },
  { value: 'Sedang', label: 'Sedang' },
  { value: 'Berat', label: 'Berat' },
];

const BASIC_FIELDS = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true },
  { key: 'slug', label: 'Slug', type: 'text' as const, placeholder: 'otomatis dari name, boleh di-override' },
  { key: 'category', label: 'Category', type: 'select' as const, required: true, options: CATEGORY_OPTIONS },
  { key: 'price', label: 'Price (IDR)', type: 'number' as const, required: true, min: 0 },
  { key: 'description', label: 'Description', type: 'textarea' as const, required: true },
  { key: 'brand_story_line', label: 'Brand Story Line', type: 'textarea' as const, required: true },
];

const SENSORY_FIELDS = [
  { key: 'sensory_descriptor', label: 'Sensory Descriptor', type: 'text' as const, required: true },
  { key: 'firmness_rating', label: 'Firmness (1-5)', type: 'number' as const, required: true, min: 1, max: 5 },
  { key: 'fill_material', label: 'Fill Material', type: 'text' as const, required: true },
  { key: 'fill_weight_equivalent', label: 'Fill Weight Equivalent', type: 'text' as const, required: true },
];

const LOGISTICS_FIELDS = [
  { key: 'delivery_estimate', label: 'Delivery Estimate', type: 'text' as const, required: true },
  { key: 'return_policy_text', label: 'Return Policy', type: 'textarea' as const, required: true },
];

const GIFT_FIELDS = [
  { key: 'gift_safe', label: 'Gift Safe', type: 'toggle' as const, helpText: 'Produk aman dikirim sebagai hadiah' },
  {
    key: 'gift_safe_note',
    label: 'Gift Safe Note',
    type: 'textarea' as const,
    required: true,
    visibleWhen: { key: 'gift_safe', equals: true },
    helpText: 'Wajib diisi kalau gift_safe aktif (divalidasi juga di backend)',
  },
];

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface VariantDraft extends AdminVariant {
  _removed?: boolean;
}

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [values, setValues] = useState<Record<string, any>>({
    name: '',
    slug: '',
    category: '',
    price: '',
    description: '',
    brand_story_line: '',
    sensory_descriptor: '',
    firmness_rating: 3,
    fill_material: '',
    fill_weight_equivalent: '',
    delivery_estimate: '',
    return_policy_text: '',
    gift_safe: false,
    gift_safe_note: '',
  });
  const [images, setImages] = useState<AdminImage[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [initialSlug, setInitialSlug] = useState<string>('');

  useEffect(() => {
    if (isNew) return;
    apiGet<ProductRow>(`/products/${id}`).then((p) => {
      setValues({
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: p.price,
        description: p.description,
        brand_story_line: p.brand_story_line,
        sensory_descriptor: p.sensory_descriptor,
        firmness_rating: p.firmness_rating,
        fill_material: p.fill_material,
        fill_weight_equivalent: p.fill_weight_equivalent,
        delivery_estimate: p.delivery_estimate,
        return_policy_text: p.return_policy_text,
        gift_safe: p.gift_safe,
        gift_safe_note: p.gift_safe_note ?? '',
      });
      setInitialSlug(p.slug);
      setImages((p.product_images ?? []).map((i) => ({ id: i.id, url: i.url, image_type: i.image_type, order_index: i.order_index })));
      setVariants((p.product_variants ?? []).map((v) => ({ ...v })));
      setReviews((p.product_reviews ?? []).map((r) => ({ ...r })));
      setLoading(false);
    });
  }, [id, isNew]);

  const setField = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  // Auto-generate slug dari name kalau slug masih kosong / belum di-override manual.
  const handleNameChange = (value: string) => {
    setValues((v) => {
      const autoSlug = isNew || !v.slug || v.slug === slugify(v.name) ? slugify(value) : v.slug;
      return { ...v, name: value, slug: autoSlug };
    });
  };

  const uploadFile = async (file: File, group: 'lifestyle' | 'texture'): Promise<AdminImage> => {
    if (isNew) {
      // Produk belum ada — tahan file, upload setelah create (butuh product id).
      return { url: URL.createObjectURL(file), image_type: group, order_index: 0, file };
    }
    const form = new FormData();
    form.append('file', file);
    form.append('image_type', group);
    const resp = await apiClientUpload(`/products/${id}/images`, form);
    return resp;
  };

  const deleteExistingImage = async (img: AdminImage) => {
    if (img.id) await apiSend('delete', `/images/${img.id}`);
  };

  // ---- Validasi mirror backend (7.3) — soft check sebelum submit ----
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!values.name?.trim()) e.name = 'Name wajib diisi';
    if (!values.category) e.category = 'Category wajib dipilih';
    if (values.price === '' || values.price === null || Number(values.price) < 0) e.price = 'Price wajib angka >= 0';
    if (!values.description?.trim()) e.description = 'Description wajib diisi';
    if (!values.brand_story_line?.trim()) e.brand_story_line = 'Brand story wajib diisi';
    if (!values.sensory_descriptor?.trim()) e.sensory_descriptor = 'Sensory descriptor wajib diisi';
    const fr = Number(values.firmness_rating);
    if (!Number.isInteger(fr) || fr < 1 || fr > 5) e.firmness_rating = 'Firmness harus 1-5';
    if (!values.fill_material?.trim()) e.fill_material = 'Fill material wajib diisi';
    if (!values.fill_weight_equivalent?.trim()) e.fill_weight_equivalent = 'Fill weight wajib diisi';
    if (!values.delivery_estimate?.trim()) e.delivery_estimate = 'Delivery estimate wajib diisi';
    if (!values.return_policy_text?.trim()) e.return_policy_text = 'Return policy wajib diisi';
    if (values.gift_safe === true && !values.gift_safe_note?.trim()) {
      e.gift_safe_note = 'gift_safe_note wajib diisi kalau gift_safe true';
    }
    if (variants.filter((v) => !v._removed).length === 0) {
      e.variants = 'Minimal 1 variant';
    }
    if (variants.filter((v) => !v._removed && v.is_default).length !== 1) {
      e.variants = 'Tepat 1 variant harus ditandai default';
    }
    if (!images.some((i) => i.image_type === 'texture')) {
      e.images = 'Minimal 1 texture image wajib';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const textureCount = useMemo(() => images.filter((i) => i.image_type === 'texture').length, [images]);

  // ---- Save ----
  const handleSave = async () => {
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const productPayload: Record<string, any> = {
        name: values.name,
        category: values.category,
        price: Number(values.price),
        description: values.description,
        brand_story_line: values.brand_story_line,
        sensory_descriptor: values.sensory_descriptor,
        firmness_rating: Number(values.firmness_rating),
        fill_material: values.fill_material,
        fill_weight_equivalent: values.fill_weight_equivalent,
        delivery_estimate: values.delivery_estimate,
        return_policy_text: values.return_policy_text,
        gift_safe: values.gift_safe === true,
      };
      if (values.gift_safe === true) productPayload.gift_safe_note = values.gift_safe_note;
      if (values.slug?.trim() && values.slug.trim() !== initialSlug) productPayload.slug = values.slug.trim();

      let productId = id!;

      if (isNew) {
        // Create dengan nested variants & reviews; images di-upload setelahnya (butuh id).
        productPayload.variants = variants.map((v, i) => ({
          label: v.label,
          price: Number(v.price),
          is_default: v.is_default,
          order_index: i,
        }));
        productPayload.reviews = reviews.map((r) => ({
          author: r.author,
          rating: r.rating,
          comment: r.comment,
          sleep_position: r.sleep_position,
          body_type: r.body_type,
        }));
        const created = await apiSend<ProductRow>('post', '/products', productPayload);
        productId = created.id;
      } else {
        await apiSend('patch', `/products/${productId}`, productPayload);
      }

      // --- Images: upload pending files, hapus yang dilepas, reorder ---
      const keptIds = new Set(images.filter((i) => i.id && !i.file).map((i) => i.id!));
      const existingBefore = images.filter((i) => i.id && !i.file);
      // (daftar id lama dibandingkan lewat state awal — gambar yang dihapus dari UI
      //  sudah langsung dihapus via onDeleteExisting, jadi tidak ada diff tambahan)

      let order = 0;
      for (const img of [...images].sort((a, b) => a.order_index - b.order_index)) {
        if (img.file) {
          const form = new FormData();
          form.append('file', img.file);
          form.append('image_type', img.image_type);
          form.append('order_index', String(order));
          await apiClientUpload(`/products/${productId}/images`, form);
        } else if (img.id && img.order_index !== order) {
          await apiSend('patch', `/images/${img.id}/reorder`, { order_index: order });
        }
        order += 1;
      }
      void keptIds;
      void existingBefore;

      if (!isNew) {
        // --- Variants diff ---
        for (const v of variants) {
          if (v._removed) {
            if (v.id) await apiSend('delete', `/variants/${v.id}`).catch((err) => alert(apiErrorMessage(err)));
            continue;
          }
          if (!v.id) {
            const created = await apiSend<{ id: string }>('post', '/variants', {
              product_id: productId,
              label: v.label,
              price: Number(v.price),
              is_default: v.is_default,
            });
            v.id = created.id;
          } else {
            await apiSend('patch', `/variants/${v.id}`, { label: v.label, price: Number(v.price) });
            if (v.is_default) {
              // PATCH is_default=true memicu unset default lain di backend (RPC atomik).
              await apiSend('patch', `/variants/${v.id}`, { is_default: true });
            }
          }
        }

        // --- Reviews diff ---
        for (const r of reviews as (AdminReview & { _removed?: boolean })[]) {
          if ((r as any)._removed) {
            if (r.id) await apiSend('delete', `/reviews/${r.id}`);
            continue;
          }
          if (!r.id) {
            const created = await apiSend<{ id: string }>('post', '/reviews', {
              product_id: productId,
              author: r.author,
              rating: r.rating,
              comment: r.comment,
              sleep_position: r.sleep_position,
              body_type: r.body_type,
            });
            r.id = created.id;
          } else {
            await apiSend('patch', `/reviews/${r.id}`, {
              author: r.author,
              rating: r.rating,
              comment: r.comment,
              sleep_position: r.sleep_position,
              body_type: r.body_type,
            });
          }
        }
      }

      navigate('/admin/products');
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Memuat produk…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {isNew ? 'New Product' : 'Edit Product'}
        </h1>
        <button onClick={() => navigate('/admin/products')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Kembali ke list
        </button>
      </div>

      <Section title="Basic Info">
        <ResourceForm
          fields={BASIC_FIELDS.map((f) => (f.key === 'name' ? { ...f } : f))}
          values={values}
          errors={errors}
          onChange={(k, v) => (k === 'name' ? handleNameChange(v as string) : setField(k, v))}
        />
      </Section>

      <Section title="Sensory Spec">
        <ResourceForm fields={SENSORY_FIELDS} values={values} errors={errors} onChange={setField} />
      </Section>

      <Section title="Logistics">
        <ResourceForm fields={LOGISTICS_FIELDS} values={values} errors={errors} onChange={setField} />
      </Section>

      <Section title="Gift">
        <ResourceForm fields={GIFT_FIELDS} values={values} errors={errors} onChange={setField} />
      </Section>

      <Section title="Images">
        <p className="mb-3 text-xs text-gray-500">
          Texture image wajib minimal 1 (saat ini: <span className={textureCount > 0 ? 'text-green-700' : 'text-red-600'}>{textureCount}</span>)
        </p>
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">Lifestyle Images</h3>
            <ImageUploader
              group="lifestyle"
              images={images.filter((i) => i.image_type === 'lifestyle')}
              onChange={(next) =>
                setImages((all) => [
                  ...all.filter((i) => i.image_type !== 'lifestyle'),
                  ...next.map((n, idx) => ({ ...n, order_index: idx })),
                ])
              }
              onUploadFile={uploadFile}
              onDeleteExisting={deleteExistingImage}
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">Texture Images</h3>
            <ImageUploader
              group="texture"
              images={images.filter((i) => i.image_type === 'texture')}
              onChange={(next) =>
                setImages((all) => [
                  ...all.filter((i) => i.image_type !== 'texture'),
                  ...next.map((n, idx) => ({ ...n, order_index: idx })),
                ])
              }
              onUploadFile={uploadFile}
              onDeleteExisting={deleteExistingImage}
            />
          </div>
        </div>
        {errors.images && <p className="mt-2 text-xs text-red-600">{errors.images}</p>}
      </Section>

      <Section title="Variants">
        <div className="space-y-3">
          {variants.filter((v) => !v._removed).length === 0 && (
            <p className="text-xs text-gray-400">Belum ada variant.</p>
          )}
          {variants.map((v, idx) =>
            v._removed ? null : (
              <div key={v.id ?? `new-${idx}`} className="flex items-end gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                <label className="block flex-1 text-sm">
                  <span className="mb-1 block text-gray-600">Label *</span>
                  <input
                    value={v.label}
                    onChange={(e) =>
                      setVariants((vs) => vs.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Firm — 60x40cm"
                  />
                </label>
                <label className="block w-40 text-sm">
                  <span className="mb-1 block text-gray-600">Price *</span>
                  <input
                    type="number"
                    value={v.price}
                    onChange={(e) =>
                      setVariants((vs) => vs.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x)))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="default-variant"
                    checked={v.is_default}
                    onChange={() =>
                      setVariants((vs) => vs.map((x, i) => ({ ...x, is_default: i === idx })))
                    }
                  />
                  default
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setVariants((vs) => vs.map((x, i) => (i === idx ? { ...x, _removed: true } : x)))
                  }
                  className="pb-2 text-xs text-red-600 hover:text-red-700"
                >
                  Hapus
                </button>
              </div>
            )
          )}
          <button
            type="button"
            onClick={() => setVariants((vs) => [...vs, { label: '', price: 0, is_default: vs.length === 0 }])}
            className="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            + Tambah Variant
          </button>
          {errors.variants && <p className="text-xs text-red-600">{errors.variants}</p>}
        </div>
      </Section>

      <Section title="Reviews">
        <div className="space-y-3">
          {reviews.filter((r) => !(r as any)._removed).length === 0 && (
            <p className="text-xs text-gray-400">Belum ada review.</p>
          )}
          {reviews.map((r, idx) =>
            (r as any)._removed ? null : (
              <div key={r.id ?? `new-${idx}`} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-end gap-3">
                  <label className="block flex-1 text-sm">
                    <span className="mb-1 block text-gray-600">Author *</span>
                    <input
                      value={r.author}
                      onChange={(e) =>
                        setReviews((rs) => rs.map((x, i) => (i === idx ? { ...x, author: e.target.value } : x)))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="block w-24 text-sm">
                    <span className="mb-1 block text-gray-600">Rating *</span>
                    <select
                      value={r.rating}
                      onChange={(e) =>
                        setReviews((rs) => rs.map((x, i) => (i === idx ? { ...x, rating: Number(e.target.value) } : x)))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block flex-1 text-sm">
                    <span className="mb-1 block text-gray-600">Sleep Position</span>
                    <select
                      value={r.sleep_position ?? ''}
                      onChange={(e) =>
                        setReviews((rs) => rs.map((x, i) => (i === idx ? { ...x, sleep_position: e.target.value || null } : x)))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="">—</option>
                      {SLEEP_POSITION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block flex-1 text-sm">
                    <span className="mb-1 block text-gray-600">Body Type</span>
                    <select
                      value={r.body_type ?? ''}
                      onChange={(e) =>
                        setReviews((rs) => rs.map((x, i) => (i === idx ? { ...x, body_type: e.target.value || null } : x)))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="">—</option>
                      {BODY_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setReviews((rs) => rs.map((x, i) => (i === idx ? { ...x, _removed: true } : x)))}
                    className="pb-2 text-xs text-red-600 hover:text-red-700"
                  >
                    Hapus
                  </button>
                </div>
                <label className="mt-2 block text-sm">
                  <span className="mb-1 block text-gray-600">Comment *</span>
                  <textarea
                    rows={2}
                    value={r.comment}
                    onChange={(e) =>
                      setReviews((rs) => rs.map((x, i) => (i === idx ? { ...x, comment: e.target.value } : x)))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>
            )
          )}
          <button
            type="button"
            onClick={() =>
              setReviews((rs) => [...rs, { author: '', rating: 5, comment: '', sleep_position: null, body_type: null }])
            }
            className="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            + Tambah Review
          </button>
        </div>
      </Section>

      {formError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
        <button
          onClick={() => navigate('/admin/products')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={busy}
          className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 border-b border-gray-100 pb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Upload multipart via apiClient supaya JWT ikut ter-attach.
import { apiClient } from '../../lib/apiClient';
async function apiClientUpload(path: string, form: FormData): Promise<AdminImage> {
  const resp = await apiClient.post(path, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data.data as AdminImage;
}
