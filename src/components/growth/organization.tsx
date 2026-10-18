import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { growthDb, organizationSchema } from '@/lib/growth';
import { useT } from '@/lib/i18n';
import { Field, Notice } from '../shared';
import { Button } from '../ui/button';
export function BuyerOrganization() {
  const tr = useT();
  const { session } = useAuth();
  const data = useQuery({
    queryKey: ['buyer-organization', session?.user.id],
    queryFn: async () => {
      const { data, error } = await growthDb().rpc('buyer_organization_get');
      if (error) throw error;
      return data === null ? null : organizationSchema.extend({ version: z.number() }).parse(data);
    },
  });
  return (
    <section className="panel growth-panel">
      <h2>{tr('Buyer business profile')}</h2>
      <p>
        {tr(
          'Your organization name and business type are visible to suppliers you contact. Licence details remain private and do not grant a verification badge.',
        )}
      </p>
      <Notice error={data.error} />
      {data.isPending ? (
        <p>{tr('Loading…')}</p>
      ) : (
        !data.isError && <OrganizationForm key={data.data?.version ?? 0} initial={data.data} />
      )}
    </section>
  );
}
function OrganizationForm({
  initial,
}: {
  initial: (z.infer<typeof organizationSchema> & { version: number }) | null;
}) {
  const tr = useT();
  const cache = useQueryClient();
  const [value, set] = useState<z.infer<typeof organizationSchema>>(
    initial ?? { name: '', business_type: 'retailer', trade_license_number: '', address: '' },
  );
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await growthDb().rpc('buyer_organization_save', {
        expected_version: initial?.version ?? 0,
        payload: organizationSchema.parse(value),
      });
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['buyer-organization'] }),
  });
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      {(['name', 'trade_license_number', 'address'] as const).map((k) => (
        <Field
          key={k}
          label={tr(
            {
              name: 'Organization name',
              trade_license_number: 'Trade licence number (private)',
              address: 'Business address (private)',
            }[k],
          )}
        >
          <input
            required={k === 'name'}
            maxLength={k === 'name' ? 160 : k === 'address' ? 500 : 100}
            value={value[k]}
            onChange={(e) => set({ ...value, [k]: e.target.value })}
          />
        </Field>
      ))}
      <Field label={tr('Business type')}>
        <select
          value={value.business_type}
          onChange={(e) =>
            set({ ...value, business_type: e.target.value as typeof value.business_type })
          }
        >
          {['retailer', 'wholesaler', 'exporter', 'institution', 'other'].map((k) => (
            <option key={k} value={k}>
              {tr(k)}
            </option>
          ))}
        </select>
      </Field>
      <Notice error={save.error} />
      <Button disabled={save.isPending}>{tr('Save business profile')}</Button>
    </form>
  );
}
export function BuyerOrganizationSummary({ buyer }: { buyer: string }) {
  const tr = useT();
  const data = useQuery({
    queryKey: ['buyer-organization-context', buyer],
    queryFn: async () => {
      const { data, error } = await growthDb().rpc('buyer_organization_context', { target: buyer });
      if (error) throw error;
      return data === null
        ? null
        : z.object({ name: z.string(), business_type: z.string() }).parse(data);
    },
  });
  return data.data ? (
    <p className="buyer-organization-summary">
      {tr('Buyer organization')}: <strong>{data.data.name}</strong> · {tr(data.data.business_type)}
    </p>
  ) : null;
}
