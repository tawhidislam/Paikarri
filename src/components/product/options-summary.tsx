import { useQuery } from '@tanstack/react-query';
import { productOptions, variantLabel } from '@/lib/buying';
import { useLocale, useT } from '@/lib/i18n';
import { money } from '@/lib/utils';
import { Notice } from '../shared';
export function OptionsSummary({ id }: { id: string }) {
  const tr = useT();
  const { locale } = useLocale();
  const data = useQuery({ queryKey: ['product-options', id], queryFn: () => productOptions(id) });
  return (
    <details>
      <summary>{tr('Variants, pricing & sourcing')}</summary>
      {data.isPending ? (
        <p>{tr('Loading…')}</p>
      ) : data.error ? (
        <Notice error={data.error} />
      ) : (
        <>
          <p>
            {data.data!.sourcing.dispatch_location} · {data.data!.sourcing.packaging}
          </p>
          <p>{data.data!.sourcing.delivery_notes}</p>
          <p>
            {tr('Preparation estimate')}:{' '}
            {data.data!.sourcing.estimates_updated_at
              ? `${data.data!.sourcing.preparation_min}–${data.data!.sourcing.preparation_max} ${tr('days')}`
              : tr('Confirm with supplier')}
          </p>
          {data
            .data!.skus.filter((s) => s.active)
            .map((s) => (
              <div key={s.id}>
                <strong>
                  {s.code} · {variantLabel(s.options) || tr('Standard')}
                </strong>
                <p>
                  {tr('Available stock')}: {s.stock}
                </p>
                <p>
                  {s.prices.map((t) => `${t.min_quantity}+: ${money(t.price, locale)}`).join(' · ')}
                </p>
              </div>
            ))}
        </>
      )}
    </details>
  );
}
