import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { productOptions } from '@/lib/buying';
import { useT } from '@/lib/i18n';
import { Notice } from '../shared';
export function ProductDelivery({ id }: { id: string }) {
  const tr = useT();
  const data = useQuery({ queryKey: ['product-options', id], queryFn: () => productOptions(id) });
  return (
    <section className="pd-section">
      <h2>
        <Truck size={22} />
        {tr('Delivery & packaging')}
      </h2>
      {data.isPending ? (
        <p aria-busy="true">{tr('Loading…')}</p>
      ) : data.error ? (
        <Notice error={data.error} />
      ) : (
        <>
          <dl className="pd-delivery-facts">
            <div>
              <dt>{tr('Preparation estimate')}</dt>
              <dd>
                {data.data?.sourcing.estimates_updated_at
                  ? `${data.data.sourcing.preparation_min}–${data.data.sourcing.preparation_max} ${tr('days')}`
                  : tr('Confirm with supplier')}
              </dd>
            </div>
            <div>
              <dt>{tr('Dispatch location')}</dt>
              <dd>{data.data?.sourcing.dispatch_location || tr('Confirm with supplier')}</dd>
            </div>
            <div>
              <dt>{tr('Packaging measurements')}</dt>
              <dd>{data.data?.sourcing.packaging || tr('Confirm with supplier')}</dd>
            </div>
          </dl>
          {data.data?.sourcing.delivery_notes && (
            <p className="preserve-lines">{data.data.sourcing.delivery_notes}</p>
          )}
          <p className="muted">
            {tr(
              'Estimates are supplier provided. Final delivery charges are confirmed after checkout.',
            )}
          </p>
        </>
      )}
    </section>
  );
}
