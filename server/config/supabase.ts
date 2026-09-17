import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Secret key hidup hanya di environment variable server — tidak pernah
// dikirim ke admin panel dalam bentuk apapun (plan 0.2).
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    'Environment variable SUPABASE_URL dan SUPABASE_SECRET_KEY wajib diisi (lihat .env.example)'
  );
}

export const env = {
  supabaseUrl,
  supabaseSecretKey,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
  // Fallback 3000 jika PORT tidak diset atau bernilai tidak valid (mis. "0").
  port: Number(process.env.PORT) || 3000,
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    // Backend pakai secret key (bypass RLS) — tidak ada session user yang perlu di-persist.
    persistSession: false,
    autoRefreshToken: false,
  },
});
