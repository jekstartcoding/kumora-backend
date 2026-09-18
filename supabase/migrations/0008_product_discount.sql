-- 0008 — Diskon produk: dua jenis, hanya boleh salah satu.
--
-- Kontrak dari permintaan client:
--   discount_percentage: potongan persen (0–100). 0 = tidak ada diskon.
--   discount_amount:     potongan nominal IDR (>= 0). 0 = tidak ada diskon.
--   Kedua bernilai > 0 sekaligus DILARANG (ditegakkan di sini via CHECK,
--   dan sekali lagi di backend supaya pesan errornya ramah).
--   Harga akhir dihitung di tampilan: price - amount, atau price * (1-pct/100).
--   Data lama tidak diberi diskon → default 0.

alter table products
  add column discount_percentage numeric(5,2) not null default 0,
  add column discount_amount integer not null default 0;

-- Kedua diskon tidak boleh aktif bersamaan.
alter table products
  add constraint products_discount_exclusive_check
  check (not (discount_percentage > 0 and discount_amount > 0));

-- Rentang nilai wajar.
alter table products
  add constraint products_discount_percentage_range_check
  check (discount_percentage >= 0 and discount_percentage <= 100);

alter table products
  add constraint products_discount_amount_range_check
  check (discount_amount >= 0);

-- Diskon nominal tidak boleh melampaui harga (harga akhir tidak boleh negatif).
alter table products
  add constraint products_discount_amount_lte_price_check
  check (discount_amount <= price);
