import { MoveUpRight } from 'lucide-react';
import { usePlatformSettings } from '@/lib/platform';
import { useLocale, useT } from '@/lib/i18n';
import { orderLabels, type OrderDetail } from '@/lib/order-schema';
import { formatOrderDate } from '@/lib/orders';
import { variantLabel } from '@/lib/buying';
import { formatQuantity } from '@/lib/units';
import { money } from '@/lib/utils';
import './receipt.css';

export function OrderReceipt({ order: o }: { order: OrderDetail }) {
  const { locale } = useLocale();
  const tr = useT();
  const platform = usePlatformSettings();
  const name =
    (locale === 'bn' ? platform.data?.name_bn : platform.data?.name_en) || 'Paikarii.com';
  const tagline =
    (locale === 'bn' ? platform.data?.tagline_bn : platform.data?.tagline_en) ||
    tr('Wholesale marketplace');
  const pending = o.status === 'pending_confirmation';
  return (
    <section className="order-receipt" aria-label={tr('Printable order receipt')} lang={locale}>
      <header className="pr-header">
        <div>
          <div className="pr-brand" role="img" aria-label={`${name} ${tr('logo')}`}>
            <span className="pr-brand-icon">
              <MoveUpRight aria-hidden="true" size={24} />
            </span>
            <span>
              {name.endsWith('.com') ? (
                <>
                  {name.slice(0, -4)}
                  <span className="pr-domain">.com</span>
                </>
              ) : (
                name
              )}
            </span>
          </div>
          <p className="pr-tagline">{tagline}</p>
          <div className="pr-support">
            {platform.data?.support_email && <span>{platform.data.support_email}</span>}
            {platform.data?.support_phone && <span>{platform.data.support_phone}</span>}
          </div>
        </div>
        <div className="pr-document">
          <span className="pr-kicker">{tr('ORDER RECEIPT')}</span>
          <strong>PK-{o.number.toString().padStart(6, '0')}</strong>
          <span>
            {tr('Placed')}: {formatOrderDate(o.created_at, locale)}
          </span>
        </div>
      </header>
      <div className="pr-status">
        <div>
          <span>{tr('Order status')}</span>
          <strong>{tr(orderLabels[o.status])}</strong>
        </div>
        <div>
          <span>{tr('Payment status')}</span>
          <strong>{tr(orderLabels[o.payment_status])}</strong>
        </div>
        <div>
          <span>{tr('Purchase type')}</span>
          <strong>{tr(o.purchase_kind)}</strong>
        </div>
      </div>
      <div className="pr-parties">
        <section>
          <h2>{tr('Supplier')}</h2>
          <strong>{o.supplier_name}</strong>
          <p className="pr-label">{tr('Buyer account')}</p>
          <span>{o.buyer_name}</span>
        </section>
        <section>
          <h2>{tr('Deliver to')}</h2>
          <address>
            <strong>{o.shipping_address.name}</strong>
            <span>{o.shipping_address.phone}</span>
            <span>{o.shipping_address.address}</span>
            <span>
              {tr(o.shipping_address.district)}, {tr(o.shipping_address.division)}
            </span>
          </address>
        </section>
      </div>
      <table className="pr-items">
        <caption>{tr('Order items')}</caption>
        <colgroup>
          <col style={{ width: '6%' }} />
          <col style={{ width: '40%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr>
            {['No.', 'Item description', 'Quantity', 'Unit price', 'Amount'].map((label) => (
              <th key={label} scope="col">
                {tr(label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {o.items.map((item, index) => (
            <tr key={item.id}>
              <td>{(index + 1).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}</td>
              <td>
                <strong>{locale === 'bn' && item.name_bn ? item.name_bn : item.name}</strong>
                {variantLabel(item.variant_snapshot ?? {}) && (
                  <small>{variantLabel(item.variant_snapshot ?? {})}</small>
                )}
              </td>
              <td>{formatQuantity(item.quantity, item.unit, locale)}</td>
              <td>{money(item.unit_price, locale)}</td>
              <td>{money(item.line_total, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pr-settlement">
        <section className="pr-payment">
          <h2>{tr('Payment method')}</h2>
          <strong>
            {o.payment_method === 'bank_transfer'
              ? `${tr(orderLabels[o.payment_method])} (${tr('Paikarii Escrow')})`
              : tr(orderLabels[o.payment_method])}
          </strong>
          <p>
            {tr('Payment status')}: {tr(orderLabels[o.payment_status])}
          </p>
          {o.payment_method === 'bank_transfer' && (
            <p className="pr-provisional">
              {tr(
                'Paid via Paikarii Escrow Bank Account. Funds held securely in trust by Paikarii until buyer delivery confirmation.',
              )}
            </p>
          )}
          {pending && (
            <p className="pr-provisional">
              {tr(
                'Delivery charges are pending supplier confirmation. The current total is provisional.',
              )}
            </p>
          )}
        </section>
        <dl className="pr-totals">
          <div>
            <dt>{tr('Product subtotal')}</dt>
            <dd>{money(o.subtotal, locale)}</dd>
          </div>
          <div>
            <dt>{tr('Delivery')}</dt>
            <dd>{pending ? tr('Supplier to confirm') : money(o.shipping_fee, locale)}</dd>
          </div>
          <div className="pr-grand-total">
            <dt>{tr(pending ? 'Current total' : 'Order total')}</dt>
            <dd>{money(o.total, locale)}</dd>
          </div>
        </dl>
      </div>
      {(o.buyer_note || o.supplier_note) && (
        <section className="pr-notes">
          <h2>{tr('Order notes')}</h2>
          {o.buyer_note && (
            <p>
              <strong>{tr('Buyer note')}: </strong>
              {o.buyer_note}
            </p>
          )}
          {o.supplier_note && (
            <p>
              <strong>{tr('Supplier note')}: </strong>
              {o.supplier_note}
            </p>
          )}
        </section>
      )}
      {!!o.payments.length && (
        <section className="pr-payment-history">
          <h2>{tr('Payment record')}</h2>
          {o.payments.map((p) => (
            <div key={p.id}>
              <strong>
                {tr(
                  p.kind === 'payment_report'
                    ? 'Bank payment reported'
                    : p.kind === 'payment_confirmed'
                      ? 'Payment verified'
                      : 'Refund verified',
                )}
              </strong>
              <span>{money(p.amount, locale)}</span>
              <span>
                {tr('Reference')}: {p.reference}
              </span>
              <small>{formatOrderDate(p.created_at, locale)}</small>
            </div>
          ))}
        </section>
      )}
      <footer className="pr-footer">
        <strong>{tr('Thank you for sourcing with Paikarii.com.')}</strong>
        <p>{tr('Order summary only. This document is not proof of payment or a tax invoice.')}</p>
        <p>{tr('For order questions, contact your supplier through your marketplace account.')}</p>
      </footer>
    </section>
  );
}
