// Fase 7 — Products resource page: list view via ResourceTable (7.1);
// form create/edit lengkap (7.2) dibangun di langkah berikutnya.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResourceTable from '../../components/ResourceTable';
import { apiGet, apiSend, apiErrorMessage } from '../../lib/apiClient';
import { productResource } from './config';
import type { ProductRow } from './types';

export default function ProductsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<ProductRow[]>('/products');
      setRows(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (row: ProductRow) => {
    try {
      await apiSend('delete', `/products/${row.id}`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  };

  return (
    <ResourceTable
      config={productResource}
      rows={rows}
      loading={loading}
      onEdit={(row) => navigate(`/admin/products/${row.id}`)}
      onDelete={handleDelete}
      toolbar={
        <>
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={() => navigate('/admin/products/new')}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            + New Product
          </button>
        </>
      }
    />
  );
}
