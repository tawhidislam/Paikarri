import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
// No client is created with placeholder credentials. Public pages expose a setup
// state until a real cloud project is configured.
export const supabase = configured
  ? createClient<Database>(url, key, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
export function db() {
  if (!supabase)
    throw new Error('Connect your Supabase Cloud project in .env.local to use this feature.');
  return supabase;
}
