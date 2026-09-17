// Fase 6.1/7.2 — ImageUploader: drag-drop upload file, preview thumbnail,
// reorder drag-and-drop, tombol hapus per gambar. Grup ditentukan prop `group`
// ('lifestyle' | 'texture') supaya form Products bisa punya dua grup terpisah.
import { useRef, useState } from 'react';

export interface AdminImage {
  id?: string; // ada kalau image sudah tersimpan di DB
  url: string;
  image_type: 'lifestyle' | 'texture';
  order_index: number;
  file?: File; // ada kalau belum ter-upload (diposting saat save)
}

interface Props {
  group: 'lifestyle' | 'texture';
  images: AdminImage[];
  onChange: (images: AdminImage[]) => void;
  onUploadFile: (file: File, group: 'lifestyle' | 'texture') => Promise<AdminImage>;
  onDeleteExisting?: (image: AdminImage) => Promise<void>;
}

export default function ImageUploader({ group, images, onChange, onUploadFile, onDeleteExisting }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);

  const sorted = [...images].sort((a, b) => a.order_index - b.order_index);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      const uploaded: AdminImage[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await onUploadFile(file, group));
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (img: AdminImage) => {
    if (img.id && onDeleteExisting) {
      setBusy(true);
      try {
        await onDeleteExisting(img);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Hapus gagal');
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    onChange(images.filter((i) => i !== img));
  };

  const reorder = (toIndex: number) => {
    const from = dragIndex.current;
    if (from === null || from === toIndex) return;
    const next = [...sorted];
    const [moved] = next.splice(from, 1);
    next.splice(toIndex, 0, moved);
    onChange(next.map((img, i) => ({ ...img, order_index: i })));
    dragIndex.current = null;
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm ${
          over ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'
        }`}
      >
        {busy ? 'Memproses…' : <>Tarik & lepas gambar ke sini, atau <span className="text-blue-600">pilih file</span> (jpg/png/webp, maks 5MB)</>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {sorted.map((img, idx) => (
            <div
              key={img.id ?? img.url}
              draggable
              onDragStart={() => (dragIndex.current = idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorder(idx)}
              className="group relative h-28 w-28 overflow-hidden rounded-md border border-gray-200 bg-gray-100"
            >
              <img src={img.url} alt={`${group}-${idx}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(img)}
                className="absolute top-1 right-1 rounded bg-red-600/90 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
