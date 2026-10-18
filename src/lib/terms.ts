import { useQuery } from '@tanstack/react-query';
import { configured, db } from './supabase';
import { publishedTermsSchema } from './terms-schema';
export * from './terms-schema';
import type { PolicyKind } from './policy-config';
export function useTerms(kind: PolicyKind = 'terms') {
  return useQuery({
    queryKey: [`${kind}-published`],
    enabled: configured,
    queryFn: async () => {
      const { data, error } = await db().rpc(
        kind === 'refund' ? 'get_refund_content' : 'get_terms_content',
      );
      if (error) throw error;
      return data === null ? null : publishedTermsSchema.parse(data);
    },
    staleTime: 60000,
    refetchOnWindowFocus: 'always',
  });
}
