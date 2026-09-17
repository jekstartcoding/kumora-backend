# Application-Level Constraints (untuk Fase 3.2 / 4.3)

Aturan bisnis berikut **tidak bisa ditegakkan penuh lewat SQL constraint biasa**,
jadi wajib divalidasi di backend Express (bukan diserahkan ke frontend admin).
Sumber: plan Fase 1.2.

| # | Aturan | Table | Ditegakkan di | Perilaku |
|---|---|---|---|---|
| 1 | Setiap produk minimal punya 1 row `product_images` dengan `image_type = 'texture'` | `product_images` | Fase 3 (create/update produk) & Fase 4 (upload/delete image) | 400 `TEXTURE_IMAGE_REQUIRED` |
| 2 | Setiap produk minimal punya 1 `product_variants` dengan `is_default = true`, dan **hanya boleh 1** yang default | `product_variants` | Fase 3.3 (`set-default` endpoint, dalam satu transaction) & Fase 4 (CRUD variant) | 400 `DEFAULT_VARIANT_REQUIRED` / `MULTIPLE_DEFAULT_VARIANTS` |
| 3 | Kalau `gift_safe = true`, `gift_safe_note` tidak boleh null/kosong | `products` | Fase 3.2 (POST/PATCH produk) | 400, pesan: "gift_safe_note wajib diisi kalau gift_safe true" |
| 4 | Tabel `quiz_mappings` wajib punya minimal 1 row dengan `is_fallback = true` — kalau tidak, quiz di frontend bisa gagal total tanpa hasil | `quiz_mappings` | Fase 4.3 (delete quiz-mapping; juga tolak uncheck fallback terakhir) | 400, pesan: "minimal harus ada 1 fallback mapping" |

Catatan:
- DB-level yang SUDAH ditegakkan oleh migration 0001: `category` enum check, `firmness_rating` 1–5, `rating` 1–5, `sleep_position`/`body_type` enum, `slug` unique.
- DB-level yang TIDAK tertangani SQL biasa (jumlah row per relasi, kondisi antar-tabel, keunikan default variant) → tanggung jawab backend sesuai tabel di atas.
