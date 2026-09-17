// Fase 6.2 — ResourceTable generik: render kolom dari config, sorting klik header,
// aksi Edit/Delete per baris (pola resource seragam — Prinsip Kerja #5).
import { useMemo, useState } from 'react';
import type { ResourceConfig } from '../resources/types';

interface Props<T extends { id: string }> {
  config: ResourceConfig<T>;
  rows: T[];
  loading?: boolean;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  toolbar?: React.ReactNode;
}

export default function ResourceTable<T extends { id: string }>({
  config,
  rows,
  loading,
  onEdit,
  onDelete,
  toolbar,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleting, setDeleting] = useState<T | null>(null);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? '');
      const bv = String((b as Record<string, unknown>)[sortKey] ?? '');
      return av.localeCompare(bv) * (sortDir === 'asc' ? 1 : -1);
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{config.name}</h1>
        <div className="flex items-center gap-3">{toolbar}</div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {config.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer px-4 py-3 text-left font-medium text-gray-500 select-none hover:text-gray-700"
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-gray-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-gray-400">
                  Memuat…
                </td>
              </tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-gray-400">
                  Belum ada data.
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {config.columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => onEdit(row)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(row)}
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

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Hapus {config.name}?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Data yang dihapus tidak bisa dikembalikan.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDelete(deleting);
                  setDeleting(null);
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Ya, hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
