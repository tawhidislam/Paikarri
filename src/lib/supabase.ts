import { createClient } from '@supabase/supabase-js';
import type { Database as GeneratedDatabase, Json } from './database.types';
// PostgreSQL accepts NULL for these picture arguments (first upload/removal).
// The cloud generator omits RPC argument nullability; preserve the actual contract
// here so regenerating database.types.ts never requires casts or hand edits.
type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Functions'> & {
    Functions: Omit<GeneratedDatabase['public']['Functions'], 'set_store_picture'> & {
      // Contract for the version-controlled badge-management migration.
      admin_set_supplier_verified: {
        Args: { target: string; grant_badge: boolean; reason: string; method?: string; valid_until?: string | null };
        Returns: Json;
      };
      set_store_picture: {
        Args: { target: string; expected_path: string | null; new_path: string | null };
        Returns: undefined;
      };
    };
  };
};
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
