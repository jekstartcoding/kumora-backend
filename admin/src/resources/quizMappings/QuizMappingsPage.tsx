// Fase 8.2 — Quiz Mappings: form memilih kombinasi jawaban (dropdown per step,
// opsi dari Quiz Options), pilih produk (dropdown), toggle is_fallback.
// UI safeguard: uncheck fallback pada satu-satunya row fallback → warning sebelum
// submit (mirror validasi backend FALLBACK_REQUIRED). List menampilkan kombinasi
// dalam bentuk terbaca manusia, bukan JSON mentah.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiSend, apiErrorMessage } from '../../lib/apiClient';

interface QuizOptionRow {
  id: string;
  step_id: string;
  option_id: string;
  label: string;
  order_index: number;
}

interface QuizMappingRow {
  id: string;
  answer_combination: Record<string, string>;
  product_id: string | null;
  is_fallback: boolean;
  products: { id: string; name: string; slug: string } | null;
}

interface ProductLite {
  id: string;
  name: string;
}

// Label opsi per step (dari quiz_options) supaya kombinasi terbaca manusia.
function humanizeCombination(
  combination: Record<string, string>,
  optionsByStep: Map<string, Map<string, string>>
): string {
  const parts = Object.entries(combination).map(([step, optionId]) => {
    const label = optionsByStep.get(step)?.get(optionId) ?? optionId;
    return label;
  });
  return parts.length ? parts.join(' + ') : 'Fallback (semua kombinasi)';
}

export default function QuizMappingsPage() {
  const [rows, setRows] = useState<QuizMappingRow[]>([]);
  const [options, setOptions] = useState<QuizOptionRow[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<{
    id?: string;
    combination: Record<string, string>;
    product_id: string;
    is_fallback: boolean;
  }>({ combination: {}, product_id: '', is_fallback: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mappings, opts, prods] = await Promise.all([
        apiGet<QuizMappingRow[]>('/quiz-mappings'),
        apiGet<QuizOptionRow[]>('/quiz-options'),
        apiGet<(ProductLite & { category: string })[]>('/products'),
      ]);
      setRows(mappings);
      setOptions(opts);
      setProducts(prods.map((p) => ({ id: p.id, name: p.name })));
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // step unik dari quiz_options → dropdown per step di form.
  const steps = useMemo(() => {
    const map = new Map<string, QuizOptionRow[]>();
    for (const o of options) {
      const list = map.get(o.step_id) ?? [];
      list.push(o);
      map.set(o.step_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.order_index - b.order_index);
    return [...map.entries()];
  }, [options]);

  const optionsByStep = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const o of options) {
      if (!map.has(o.step_id)) map.set(o.step_id, new Map());
      map.get(o.step_id)!.set(o.option_id, o.label);
    }
    return map;
  }, [options]);

  const fallbackCount = useMemo(() => rows.filter((r) => r.is_fallback).length, [rows]);

  const openCreate = () => {
    setForm({ combination: {}, product_id: '', is_fallback: false });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (row: QuizMappingRow) => {
    setForm({
      id: row.id,
      combination: { ...row.answer_combination },
      product_id: row.product_id ?? '',
      is_fallback: row.is_fallback,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError('');
    const combination = Object.fromEntries(
      Object.entries(form.combination).filter(([, v]) => v !== '')
    );
    if (!form.is_fallback && Object.keys(combination).length === 0) {
      setFormError('Kombinasi jawaban wajib dipilih (atau aktifkan fallback)');
      return;
    }

    // UI safeguard 8.2 — uncheck fallback pada satu-satunya fallback → warning.
    if (form.id) {
      const current = rows.find((r) => r.id === form.id);
      if (current?.is_fallback && !form.is_fallback && fallbackCount <= 1) {
        const ok = window.confirm(
          'Ini satu-satunya fallback quiz — pastikan ada pengganti sebelum menyimpan. Lanjutkan?'
        );
        if (!ok) return;
        // Tetap dikirim: backend akan menolak (FALLBACK_REQUIRED) karena memang belum ada pengganti.
      }
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        answer_combination: combination,
        is_fallback: form.is_fallback,
        product_id: form.product_id || null,
      };
      if (form.id) {
        await apiSend('patch', `/quiz-mappings/${form.id}`, payload);
      } else {
        await apiSend('post', '/quiz-mappings', payload);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row: QuizMappingRow) => {
    if (row.is_fallback && fallbackCount <= 1) {
      alert('Ini satu-satunya fallback quiz — minimal harus ada 1 fallback mapping.');
      return;
    }
    if (!confirm('Hapus mapping ini?')) return;
    try {
      await apiSend('delete', `/quiz-mappings/${row.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Quiz Mappings</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + New Mapping
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Memuat…</p>}
      {!loading && rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Belum ada mapping. Quiz di frontend butuh minimal 1 fallback — buat dulu.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Kombinasi Jawaban</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Produk</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Fallback</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">
                  {humanizeCombination(row.answer_combination, optionsByStep)}
                </td>
                <td className="px-4 py-3 text-gray-700">{row.products?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  {row.is_fallback ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">fallback</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(row)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(row)}
                    className="ml-2 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {form.id ? 'Edit Mapping' : 'New Mapping'}
            </h2>

            <div className="mt-4 space-y-3">
              {steps.map(([stepId, opts]) => (
                <label key={stepId} className="block text-sm">
                  <span className="mb-1 block text-gray-600">{stepId}</span>
                  <select
                    value={form.combination[stepId] ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        combination: { ...f.combination, [stepId]: e.target.value },
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">— (tidak dibatasi) —</option>
                    {opts.map((o) => (
                      <option key={o.id} value={o.option_id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">Produk hasil</span>
                <select
                  value={form.product_id}
                  onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">— tanpa produk —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_fallback}
                  onChange={(e) => setForm((f) => ({ ...f, is_fallback: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Jadikan fallback (dipakai kalau tidak ada mapping yang cocok)
              </label>
            </div>

            {formError && <p className="mt-3 text-xs text-red-600">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {busy ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
