// Fase 6/8 — Quiz Options resource page. List sederhana di Fase 6;
// grouped table + form (8.1) dilengkapi di Fase 8.
import { useCallback, useEffect, useState } from 'react';
import ResourceTable from '../../components/ResourceTable';
import { apiGet, apiErrorMessage } from '../../lib/apiClient';
import type { ResourceConfig } from '../types';

interface QuizOptionRow {
  id: string;
  step_id: string;
  option_id: string;
  label: string;
  order_index: number;
}

const quizOptionResource: ResourceConfig<QuizOptionRow> = {
  name: 'Quiz Options',
  endpoint: '/quiz-options',
  columns: [
    { key: 'step_id', label: 'Step' },
    { key: 'option_id', label: 'Option ID' },
    { key: 'label', label: 'Label' },
    { key: 'order_index', label: 'Order' },
  ],
  formFields: [],
};

export default function QuizOptionsPage() {
  const [rows, setRows] = useState<QuizOptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <ResourceTable
      config={quizOptionResource}
      rows={rows}
      loading={loading}
      onEdit={() => {}}
      onDelete={() => {}}
      toolbar={error ? <span className="text-xs text-red-600">{error}</span> : undefined}
    />
  );
}
