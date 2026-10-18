import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { growthDb, shippingSchema, shippingEstimate, type ShippingPreset } from '@/lib/growth';
import { useT, useLocale } from '@/lib/i18n';
import { locations } from '@/lib/locations';
import { money } from '@/lib/utils';
import { Field, Notice } from '../shared';
import { Button } from '../ui/button';
const defaults: ShippingPreset = {
  enabled: false,
  inside_dhaka_base: 0,
  outside_dhaka_base: 0,
  per_kg_surcharge: 0,
  free_shipping_threshold: null,
  carrier_preference: 'self',
};
export function ShippingSettings({ business }: { business: string }) {
  const tr = useT();
  const cache = useQueryClient();
  const data = useQuery({
    queryKey: ['shipping-settings', business],
    queryFn: async () => {
      const { data, error } = await growthDb().rpc('shipping_preset_get');
      if (error) throw error;
      return data === null ? null : shippingSchema.extend({ version: z.number() }).parse(data);
    },
  });
  return (
    <section className="panel growth-panel">
      <h2>{tr('Shipping rate presets')}</h2>
      <p>{tr('Estimates only. Supplier confirmation and buyer acceptance are still required.')}</p>
      <Notice error={data.error} />
      {data.isPending ? (
        <p>{tr('Loading…')}</p>
      ) : (
        !data.isError && (
          <ShippingForm
            key={data.data?.version ?? 0}
            business={business}
            initial={data.data ?? defaults}
            version={data.data?.version ?? 0}
            onSaved={() => cache.invalidateQueries({ queryKey: ['shipping-settings'] })}
          />
        )
      )}
    </section>
  );
}
function ShippingForm({
  business,
  initial,
  version,
  onSaved,
}: {
  business: string;
  initial: ShippingPreset;
  version: number;
  onSaved: () => Promise<unknown>;
}) {
  const tr = useT();
  const [value, set] = useState(initial);
  const save = useMutation({
    mutationFn: async () => {
      const payload = shippingSchema.parse(value);
      const { error } = await growthDb().rpc('shipping_preset_save', {
        target: business,
        expected_version: version,
        payload,
      });
      if (error) throw error;
    },
    onSuccess: () => onSaved(),
  });
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="check-label">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set({ ...value, enabled: e.target.checked })}
        />
        {tr('Show delivery estimates')}
      </label>
      <div className="form-grid">
        {(['inside_dhaka_base', 'outside_dhaka_base', 'per_kg_surcharge'] as const).map((key) => (
          <Field
            key={key}
            label={tr(
              {
                inside_dhaka_base: 'Dhaka district base (BDT)',
                outside_dhaka_base: 'Other districts base (BDT)',
                per_kg_surcharge: 'Per started kg (BDT)',
              }[key],
            )}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={value[key]}
              onChange={(e) => set({ ...value, [key]: e.target.valueAsNumber })}
            />
          </Field>
        ))}
        <Field label={tr('Free delivery above (BDT)')}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={value.free_shipping_threshold ?? ''}
            onChange={(e) =>
              set({
                ...value,
                free_shipping_threshold: e.target.value === '' ? null : e.target.valueAsNumber,
              })
            }
          />
        </Field>
        <Field label={tr('Preferred carrier')}>
          <select
            value={value.carrier_preference}
            onChange={(e) =>
              set({
                ...value,
                carrier_preference: e.target.value as ShippingPreset['carrier_preference'],
              })
            }
          >
            {['self', 'steadfast', 'sundarban', 'pathao', 'sa_paribahan'].map((c) => (
              <option key={c} value={c}>
                {tr(c)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Notice
        error={save.error}
        success={save.isSuccess ? tr('Shipping presets saved') : undefined}
      />
      <Button disabled={save.isPending}>{tr('Save shipping presets')}</Button>
    </form>
  );
}
export function ShippingCalculator({
  business,
  subtotal = 0,
  district: selectedDistrict,
}: {
  business: string;
  subtotal?: number;
  district?: string;
}) {
  const tr = useT();
  const { locale } = useLocale();
  const [district, setDistrict] = useState('Dhaka');
  const [weight, setWeight] = useState(1);
  const data = useQuery({
    queryKey: ['public-shipping', business],
    queryFn: async () => {
      const { data, error } = await growthDb().rpc('public_shipping_presets', { target: business });
      if (error) throw error;
      return data === null ? null : shippingSchema.parse(data);
    },
  });
  if (data.isPending) return <p>{tr('Loading delivery estimate…')}</p>;
  if (data.isError)
    return (
      <div>
        <p>{tr('Delivery estimate unavailable')}</p>
        <button onClick={() => void data.refetch()}>{tr('Try again')}</button>
      </div>
    );
  if (!data.data) return <p>{tr('Ask the supplier for a delivery estimate.')}</p>;
  const estimate = shippingEstimate(data.data, selectedDistrict ?? district, weight, subtotal);
  return (
    <div className="shipping-calculator">
      <h3>{tr('Estimated delivery cost')}</h3>
      <div className="form-grid">
        <Field label={tr('Delivery district')}>
          <select
            value={selectedDistrict ?? district}
            disabled={!!selectedDistrict}
            onChange={(e) => setDistrict(e.target.value)}
          >
            {Object.values(locations)
              .flat()
              .sort()
              .map((d) => (
                <option key={d} value={d}>
                  {tr(d)}
                </option>
              ))}
          </select>
        </Field>
        <Field label={tr('Total shipment weight (kg)')}>
          <input
            type="number"
            min="0.01"
            max="100000"
            step="0.01"
            value={Number.isFinite(weight) ? weight : ''}
            onChange={(e) => setWeight(e.target.valueAsNumber)}
          />
        </Field>
      </div>
      <output>{estimate === null ? '—' : money(estimate, locale)}</output>
      <p>
        {tr(
          'Estimate based on your entered shipment weight. Packing, freight and final charges require supplier confirmation.',
        )}
      </p>
    </div>
  );
}
