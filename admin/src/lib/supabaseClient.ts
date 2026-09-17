// Fase 6.1 — Supabase client admin panel: HANYA untuk auth (login/logout/session).
// Inisialisasi dengan Publishable key (aman di client-side) — plan 0.2 & 6.1.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY wajib diisi (lihat admin/.env.example)'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Session disimpan agar login bertahan; admin panel satu-satunya konsumen.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
