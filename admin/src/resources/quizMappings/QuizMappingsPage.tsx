// Fase 6/8 — Quiz Mappings resource page. List sederhana di Fase 6;
// form kombinasi jawaban + warning fallback (8.2) dilengkapi di Fase 8.
import { useCallback, useEffect, useState } from 'react';
import ResourceTable from '../../components/ResourceTable';
import { apiGet, apiErrorMessage } from '../../lib/apiClient';
import type { ResourceConfig } from '../types';

interface QuizMappingRow {
  id: string;
  answer_combination: Record<string, string>;
  is_fallback: boolean;
  products: { id: string; name: string; slug: string } | null;
}

const quizMappingResource: ResourceConfig<QuizMappingRow> = {
  name: 'Quiz Mappings',
  endpoint: '/quiz-mappings',
  columns: [
    {
      key: 'answer_combination',
      label: 'Kombinasi Jawaban',
      render: (row) => <code className="text-xs">{JSON.stringify(row.answer_combination)}</code>,
    },
    {
      key: 'products',
      label: 'Produk',
      render: (row) => row.products?.name ?? '—',
    },
    {
      key: 'is_fallback',
      label: 'Fallback',
      render: (row) =>
        row.is_fallback ? (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">fallback</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ],
  formFields: [],
};

export default function QuizMappingsPage() {
  const [rows, setRows] = useState<QuizMappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await apiGet<QuizMappingRow[]>('/quiz-mappings'));
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

  return (
    <ResourceTable
      config={quizMappingResource}
      rows={rows}
      loading={loading}
      onEdit={() => {}}
      onDelete={() => {}}
      toolbar={error ? <span className="text-xs text-red-600">{error}</span> : undefined}
    />
  );
}
