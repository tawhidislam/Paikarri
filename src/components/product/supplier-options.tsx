import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  productOptions,
  saveOptions,
  variantLabel,
  type ProductOptions,
  type Sku,
} from '@/lib/buying';
import { db } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { Button } from '../ui/button';
import { Field, Notice } from '../shared';
import { randomUUID } from '@/lib/utils';
import '../../pages/product.css';
type EditableSku = Omit<Sku, 'id'> & { id?: string };
export function SupplierOptions({ id }: { id: string }) {
  const tr = useT();
  const data = useQuery({ queryKey: ['product-options', id], queryFn: () => productOptions(id) });
  if (data.isPending) return <p aria-busy="true">{tr('Loading buying options…')}</p>;
  if (data.error)
    return (
      <>
        <Notice error={data.error} />
        <Button onClick={() => void data.refetch()}>{tr('Try again')}</Button>
      </>
    );
  return (
    <OptionsEditor
      key={`${id}-${data.data!.sourcing.version}-${data.data!.skus.map((s) => s.version).join('-')}`}
      id={id}
      value={data.data!}
    />
  );
}
function OptionsEditor({ id, value }: { id: string; value: ProductOptions }) {
  const tr = useT();
  const cache = useQueryClient();
  const [source, setSource] = useState(value.sourcing);
  const [skus, setSkus] = useState<EditableSku[]>(value.skus.filter((s) => s.active));
  const [attributes, setAttributes] = useState(
    value.attributes.map((a) => `${a.name}: ${a.values.join(', ')}`).join('\n'),
  );
  const [error, setError] = useState<unknown>(null);
  const images = useQuery({
    queryKey: ['editor-sku-images', id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('product_images')
        .select('id,path,position')
        .eq('product_id', id)
        .order('position');
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['product-options', id] });
    void cache.invalidateQueries({ queryKey: ['edit-product', id] });
    void cache.invalidateQueries({ queryKey: ['own-products'] });
  };
  const save = useMutation({
    mutationFn: () => saveOptions(id, value.sourcing.version, { sourcing: source, skus }),
    onSuccess: refresh,
  });
  const inventory = useMutation({
    mutationFn: async (s: EditableSku) => {
      if (!s.id) throw new Error('Save new variants before updating stock');
      const original = value.skus.find((k) => k.id === s.id)!;
      const { error } = await db().rpc('supplier_inventory', {
        target: s.id,
        expected_version: original.version,
        quantity: s.stock,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const update = (i: number, change: Partial<EditableSku>) =>
    setSkus((v) => v.map((s, j) => (j === i ? { ...s, ...change } : s)));
  const generate = () => {
    try {
      const attrs = attributes
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => {
          const pos = l.indexOf(':');
          if (pos < 1) throw new Error('Use Attribute: value, value on each line');
          return {
            name: l.slice(0, pos).trim(),
            values: [
              ...new Set(
                l
                  .slice(pos + 1)
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean),
              ),
            ],
          };
        });
      if (
        attrs.length > 3 ||
        new Set(attrs.map((a) => a.name)).size !== attrs.length ||
        attrs.some(
          (a) => !a.values.length || a.name.length > 60 || a.values.some((v) => v.length > 80),
        )
      )
        throw new Error('Use up to three unique attributes with non-empty values');
      let combos: Record<string, string>[] = [{}];
      for (const attr of attrs) {
        if (combos.length * attr.values.length > 100)
          throw new Error('At most 100 SKU combinations');
        combos = combos.flatMap((c) => attr.values.map((v) => ({ ...c, [attr.name]: v })));
      }
      const thresholds = value.skus[0]?.prices ?? [];
      setSkus(
        combos.map((options, i) => {
          const match = value.skus.find(
            (s) =>
              JSON.stringify(Object.entries(s.options).sort()) ===
              JSON.stringify(Object.entries(options).sort()),
          );
          return match
            ? { ...match, active: true }
            : {
                code: `SKU-${randomUUID().slice(0, 8)}-${i + 1}`,
                stock: 0,
                active: true,
                image_id: null,
                version: 1,
                options,
                prices: thresholds.map((t) => ({ ...t })),
              };
        }),
      );
      setError(null);
    } catch (e) {
      setError(e);
    }
  };
  return (
    <section className="pd-section pd-page">
      <h2>{tr('Variants, pricing & sourcing')}</h2>
      <p>
        {tr(
          'Public option and sourcing changes require listing review. Use stock-only controls to retain approval.',
        )}
      </p>
      <Field label={tr('Variant attributes')}>
        <textarea
          placeholder={'Color: Red, Blue\nSize: S, M'}
          value={attributes}
          onChange={(e) => setAttributes(e.target.value)}
          maxLength={5000}
        />
      </Field>
      <Button type="button" variant="outline" onClick={generate}>
        {tr('Generate combinations')}
      </Button>
      <p className="muted">
        {tr(
          'Existing SKU identities stay fixed. Regenerate combinations to create or archive variants.',
        )}
      </p>
      <Notice error={error} />
      <div className="pd-sku-editor">
        {skus.map((s, i) => (
          <fieldset key={s.id ?? s.code}>
            <legend>{variantLabel(s.options) || tr('Standard')}</legend>
            <div className="form-grid">
              <Field label={tr('SKU code')}>
                <input
                  maxLength={80}
                  readOnly={!!s.id}
                  value={s.code}
                  onChange={(e) => update(i, { code: e.target.value })}
                />
              </Field>
              <Field label={tr('Available stock')}>
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  value={s.stock}
                  onChange={(e) => update(i, { stock: e.target.valueAsNumber })}
                />
              </Field>
              <Field label={tr('Variant image')}>
                <select
                  value={s.image_id ?? ''}
                  onChange={(e) => update(i, { image_id: e.target.value || null })}
                >
                  <option value="">{tr('Default image')}</option>
                  {images.data?.map((image, j) => (
                    <option key={image.id} value={image.id}>
                      {tr('Product image')} {j + 1}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <label>
              <input
                type="checkbox"
                checked={s.active}
                onChange={(e) => update(i, { active: e.target.checked })}
              />
              {tr('Active SKU')}
            </label>
            <div className="pd-price-matrix">
              {s.prices.map((tier, j) => (
                <Field
                  key={tier.min_quantity}
                  label={`${tier.min_quantity}+ · ${tr('Unit price (BDT)')}`}
                >
                  <input
                    type="number"
                    min={0.01}
                    step=".01"
                    value={tier.price}
                    onChange={(e) =>
                      update(i, {
                        prices: s.prices.map((p, k) =>
                          j === k ? { ...p, price: e.target.valueAsNumber } : p,
                        ),
                      })
                    }
                  />
                </Field>
              ))}
            </div>
            {s.id && (
              <Button
                type="button"
                variant="outline"
                disabled={inventory.isPending}
                onClick={() => inventory.mutate(s)}
              >
                {tr('Update stock only')}
              </Button>
            )}
          </fieldset>
        ))}
      </div>
      <h3>{tr('Delivery estimates')}</h3>
      <div className="form-grid">
        <Field label={tr('Preparation minimum (days)')}>
          <input
            type="number"
            min={0}
            max={365}
            value={source.preparation_min}
            onChange={(e) => setSource({ ...source, preparation_min: e.target.valueAsNumber })}
          />
        </Field>
        <Field label={tr('Preparation maximum (days)')}>
          <input
            type="number"
            min={source.preparation_min}
            max={365}
            value={source.preparation_max}
            onChange={(e) => setSource({ ...source, preparation_max: e.target.valueAsNumber })}
          />
        </Field>
      </div>
      <Field label={tr('Dispatch location')}>
        <input
          maxLength={200}
          value={source.dispatch_location}
          onChange={(e) => setSource({ ...source, dispatch_location: e.target.value })}
        />
      </Field>
      <Field label={tr('Packaging measurements')}>
        <textarea
          maxLength={500}
          value={source.packaging}
          onChange={(e) => setSource({ ...source, packaging: e.target.value })}
        />
      </Field>
      <Field label={tr('Delivery notes')}>
        <textarea
          maxLength={2000}
          value={source.delivery_notes}
          onChange={(e) => setSource({ ...source, delivery_notes: e.target.value })}
        />
      </Field>
      <div className="form-grid">
        <Field label={tr('Samples available')}>
          <input
            type="checkbox"
            checked={source.samples_enabled}
            onChange={(e) => setSource({ ...source, samples_enabled: e.target.checked })}
          />
        </Field>
        <Field label={tr('Maximum sample units')}>
          <input
            type="number"
            min={1}
            max={10}
            value={source.sample_limit}
            onChange={(e) => setSource({ ...source, sample_limit: e.target.valueAsNumber })}
          />
        </Field>
        <Field label={tr('Customization available')}>
          <input
            type="checkbox"
            checked={source.customization_enabled}
            onChange={(e) => setSource({ ...source, customization_enabled: e.target.checked })}
          />
        </Field>
        <Field label={tr('Customization minimum quantity')}>
          <input
            type="number"
            min={1}
            value={source.customization_moq}
            onChange={(e) => setSource({ ...source, customization_moq: e.target.valueAsNumber })}
          />
        </Field>
      </div>
      <Notice
        error={save.error ?? inventory.error}
        success={
          save.isSuccess
            ? tr('Saved for listing review')
            : inventory.isSuccess
              ? tr('Stock updated')
              : undefined
        }
      />
      <Button disabled={save.isPending} onClick={() => save.mutate()}>
        {tr('Save options for review')}
      </Button>
    </section>
  );
}
