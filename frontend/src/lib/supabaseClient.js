import { createClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG = {
  auth: {
    // The expense-tracker app persists its own session in localStorage.
    // Supabase sessions are exchanged for the API JWT at
    // POST /api/auth/supabase-login.
    persistSession: false,
  },
};

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://rixidsaynxniblysmlxu.supabase.co';
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_e-bD-WsUzb-GdzzS5eoStw_mC8lm4WW';

const supabase = createClient(url, key, SUPABASE_CONFIG);

export default supabase;
