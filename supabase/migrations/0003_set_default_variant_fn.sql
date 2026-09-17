-- Fase 3.3 — set-default variant dalam SATU transaction.
-- Plan mewajibkan: "otomatis meng-unset variant lain yang sebelumnya default
-- (dalam satu transaction, bukan dua query terpisah yang bisa race condition)".
-- Function ini mengeksekusinya dengan satu statement UPDATE atomik:
-- is_default = (id = p_variant_id) sekaligus meng-unset yang lain dan men-set target.
create or replace function set_default_variant(p_product_id uuid, p_variant_id uuid)
returns void
language plpgsql
as $$
begin
  update product_variants
  set is_default = (id = p_variant_id)
  where product_id = p_product_id;
end;
$$;
