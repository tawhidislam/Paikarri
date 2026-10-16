import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import { db, supabase } from './supabase';
import type { Role } from './models';
import { State } from '@/components/shared';
const AuthContext = createContext<{
  session: Session | null;
  role: Role | null;
  loading: boolean;
  error: Error | null;
}>({ session: null, role: null, loading: true, error: null });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState<Error | null>(null);
  const cache = useQueryClient();
  useEffect(() => {
    if (!supabase) return;
    let current: string | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (current !== next?.user.id) {
        cache.clear();
        current = next?.user.id;
      }
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error);
      setSession(data.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [cache]);
  const roleQuery = useQuery({
    queryKey: ['role', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db()
        .from('user_roles')
        .select('role')
        .eq('user_id', session!.user.id)
        .single();
      if (error) throw error;
      if (!['buyer', 'supplier', 'admin'].includes(data.role))
        throw new Error('Unknown account role.');
      return data.role as Role;
    },
  });
  return (
    <AuthContext.Provider
      value={{
        session,
        role: roleQuery.data ?? null,
        loading: loading || (!!session && roleQuery.isPending),
        error: authError ?? roleQuery.error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const a = useAuth();
  const loc = useLocation();
  if (a.loading) return <State title="Checking your account…" />;
  if (a.error) return <State title="Account unavailable" description={a.error.message} />;
  if (!a.session)
    return (
      <Navigate to={`/auth/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
    );
  if (roles && !roles.includes(a.role!))
    return (
      <State
        title="Access restricted"
        description="Your account does not have access to this area."
      />
    );
  return children;
}
