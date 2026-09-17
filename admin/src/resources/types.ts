// Fase 6.2 — Pola "Resource" meniru konsep Filament: satu config object per entity,
// ResourceTable/ResourceForm generik membacanya. Menambah resource baru di masa depan
// = bikin 1 config file baru, bukan halaman UI baru.
import type { ReactNode } from 'react';

export type FormFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'textarea'
  | 'toggle'
  | 'image-upload'
  | 'repeater';

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  // select kondisional (mis. gift_safe_note hanya tampil kalau gift_safe aktif)
  visibleWhen?: { key: string; equals: unknown };
  fields?: FormFieldConfig[]; // untuk repeater
}

export interface ResourceColumn<T> {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
}

export interface ResourceConfig<T> {
  name: string;
  endpoint: string;
  columns: ResourceColumn<T>[];
  formFields: FormFieldConfig[];
}
