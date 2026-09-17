// Fase 8.1 — Quiz Options: list dikelompokkan per step_id (grouped table) supaya
// admin melihat semua opsi untuk satu step quiz sekaligus; form create/edit sederhana.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiSend, apiErrorMessage } from '../../lib/apiClient';

interface QuizOptionRow {
  id: string;
  step_id: string;
  option_id: string;
  label: string;
  order_index: number;
}

const EMPTY_FORM = { step_id: '', option_id: '', label: '', order_index: 0 };

export default function QuizOptionsPage() {
  const [rows, setRows] = useState<QuizOptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<typeof EMPTY_FORM & { id?: string }>({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await apiGet<QuizOptionRow[]>('/quiz-options'));
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

  // Grouped per step_id (8.1) — urut step lalu order_index.
  const grouped = useMemo(() => {
    const map = new Map<string, QuizOptionRow[]>();
    for (const row of [...rows].sort((a, b) => a.order_index - b.order_index)) {
      const list = map.get(row.step_id) ?? [];
      list.push(row);
      map.set(row.step_id, list);
    }
    return [...map.entries()];
  }, [rows]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (row: QuizOptionRow) => {
    setForm({ id: row.id, step_id: row.step_id, option_id: row.option_id, label: row.label, order_index: row.order_index });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.step_id.trim() || !form.option_id.trim() || !form.label.trim()) {
      setFormError('step_id, option_id, dan label wajib diisi');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        step_id: form.step_id.trim(),
        option_id: form.option_id.trim(),
        label: form.label,
        order_index: Number(form.order_index) || 0,
      };
      if (form.id) {
        await apiSend('patch', `/quiz-options/${form.id}`, payload);
      } else {
        await apiSend('post', '/quiz-options', payload);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row: QuizOptionRow) => {
    if (!confirm(`Hapus opsi "${row.label}" dari step "${row.step_id}"?`)) return;
    try {
      await apiSend('delete', `/quiz-options/${row.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Quiz Options</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + New Option
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Memuat…</p>}

      {!loading && grouped.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Belum ada quiz option.
        </p>
      )}

      <div className="space-y-5">
        {grouped.map(([stepId, options]) => (
          <div key={stepId} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700">
              Step: <code className="text-xs">{stepId}</code>
              <span className="ml-2 text-xs text-gray-400">({options.length} opsi)</span>
            </div>
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <tbody className="divide-y divide-gray-100">
                {options.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500">{row.order_index}</td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs text-gray-500">{row.option_id}</code>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
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
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {form.id ? 'Edit Option' : 'New Option'}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">step_id *</span>
                <input
                  value={form.step_id}
                  onChange={(e) => setForm({ ...form, step_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="sleep_position"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">option_id *</span>
                <input
                  value={form.option_id}
                  onChange={(e) => setForm({ ...form, option_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="menyamping"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">label *</span>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Menyamping"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">order_index</span>
                <input
                  type="number"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
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
