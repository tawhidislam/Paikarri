import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { db } from '@/lib/supabase';
import { Button } from './ui/button';
import { Notice } from './shared';
export function SaveSupplier({ id }: { id: string }) {
  const tr = useT();
  const { session, role } = useAuth();
  const cache = useQueryClient();
  const key = ['saved-supplier', session?.user.id, id];
  const saved = useQuery({
    queryKey: key,
    enabled: !!session && role === 'buyer',
    queryFn: async () => {
      const { data, error } = await db()
        .from('saved_suppliers')
        .select('business_id')
        .eq('user_id', session!.user.id)
        .eq('business_id', id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const action = useMutation({
    mutationFn: async () => {
      const res = saved.data
        ? await db()
            .from('saved_suppliers')
            .delete()
            .eq('user_id', session!.user.id)
            .eq('business_id', id)
        : await db().from('saved_suppliers').insert({ user_id: session!.user.id, business_id: id });
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: key });
      void cache.invalidateQueries({ queryKey: ['saved-suppliers'] });
    },
  });
  return (
    <div>
      {!session ? (
        <Button asChild>
          <Link to="/auth/login">{tr('Sign in to save supplier')}</Link>
        </Button>
      ) : (
        role === 'buyer' && (
          <Button onClick={() => action.mutate()} disabled={action.isPending}>
            {tr(saved.data ? 'Unsave supplier' : 'Save supplier')}
          </Button>
        )
      )}
      <Notice error={action.error} />
    </div>
  );
}
