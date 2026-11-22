import { createClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG = {
  auth: {
    // The expense-tracker app persists its own session in localStorage.
    // Supabase sessions are exchanged for the API JWT at
    // POST /api/auth/supabase-login.
    persistSession: false,
  },
};

// Supabase is only used to initiate real Google Sign In With Google.
// Sessions are exchanged with the expense-tracker API at
// POST /api/auth/supabase-login.
const supabase =
  window.supabase ??
  createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_CONFIG,
  );

export default supabase;
