import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const isRemembered = typeof window !== 'undefined' && localStorage.getItem('yw-remember-me') === '1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined'
      ? (isRemembered ? localStorage : sessionStorage)
      : undefined,
    storageKey: 'yw-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
