// Fase 7 — Config resource Products (Fase 7.1 list, 7.2 form sections).
// Field image-upload tidak lewat ResourceForm generik — dikelola ProductsPage
// langsung dengan ImageUploader dua grup (plan 7.2 section "Images").
import type { ProductRow } from './types';
import type { ResourceConfig } from '../types';

export const productResource: ResourceConfig<ProductRow> = {
  name: 'Products',
  endpoint: '/products',
  columns: [
    {
      key: 'lifestyle_thumbnail',
      label: '',
      render: (row) =>
        row.lifestyle_thumbnail ? (
          <img
            src={row.lifestyle_thumbnail}
            alt={row.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-gray-100" />
        ),
    },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    {
      key: 'price',
      label: 'Price',
      render: (row) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
          Number(row.price)
        ),
    },
    { key: 'variant_count', label: 'Variants' },
  ],
  formFields: [],
};
