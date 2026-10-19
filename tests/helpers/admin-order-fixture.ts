import type { Page } from '@playwright/test';
import { orderFixture, oid } from './order-fixture';
import { bid } from './chat-fixture';
export async function adminOrderFixture(
  page: Page,
  options: {
    locale?: string;
    status?: string;
    payment?: string;
    returnStatus?: string;
    failList?: boolean;
  } = {},
) {
  const calls = await orderFixture(page, {
    role: 'super_admin',
    status: options.status ?? 'processing',
    payment: options.payment ?? 'reported',
    method: 'bank_transfer',
    locale: options.locale ?? 'en',
    returnStatus: options.returnStatus ?? '',
    reportedReference: 'SYNTHETIC-BANK-101',
    tracking: 'SYNTHETIC-TRACK-101',
  });
  const requests: { method: string; filters: string[]; offset: number; limit: number }[] = [];
  let fail = options.failList ?? false;
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      name = url.pathname.split('/').pop();
    if (name === 'orders' && url.pathname.includes('/rest/v1/')) {
      const filters = url.searchParams.getAll('or');
      requests.push({
        method: request.method(),
        filters,
        offset: Number(url.searchParams.get('offset') ?? 0),
        limit: Number(url.searchParams.get('limit') ?? 25),
      });
      if (fail && request.method() !== 'HEAD')
        return route.fulfill({ status: 503, json: { message: 'Synthetic queue unavailable' } });
      const first = calls.getOrder();
      let rows = [
        first,
        ...[
          ['disputed', 'reported'],
          ['cancelled', 'refund_pending'],
          ['shipped', 'paid'],
          ['completed', 'paid'],
          ['processing', 'unpaid'],
          ['awaiting_acceptance', 'unpaid'],
        ].map(([status, payment_status], i) => ({
          ...first,
          id: `71000000-0000-4000-8000-${String(i + 2).padStart(12, '0')}`,
          number: 102 + i,
          status,
          payment_status,
          payment_method: payment_status === 'unpaid' ? 'cod' : 'bank_transfer',
        })),
      ].map((order) => ({
        ...order,
        order_shipments: [{ count: order.status === 'shipped' ? 1 : 0 }],
        order_payments: [{ count: order.payment_status === 'unpaid' ? 0 : 1 }],
      }));
      for (const filter of filters) {
        if (filter.includes('supplier_name.ilike')) {
          const value = filter.match(/ilike\."%([^"%]*)%"/)?.[1].toLowerCase() ?? '';
          const number = Number(filter.match(/number\.eq\.(\d+)/)?.[1]);
          rows = rows.filter(
            (row) =>
              `${row.supplier_name} ${row.buyer_name}`.toLowerCase().includes(value) ||
              row.number === number,
          );
        } else if (
          filter.includes('status.eq.disputed,payment_status.in.(reported,refund_pending)')
        )
          rows = rows.filter(
            (row) =>
              row.status === 'disputed' ||
              ['reported', 'refund_pending'].includes(row.payment_status),
          );
        else if (filter.includes('status.in.(')) {
          const values = filter.match(/status\.in\.\(([^)]+)\)/)![1].split(',');
          rows = rows.filter((row) => values.includes(row.status));
        } else if (filter.includes('payment_status.eq.'))
          rows = rows.filter(
            (row) => row.payment_status === filter.match(/payment_status\.eq\.([a-z_]+)/)![1],
          );
        else if (filter.includes('status.eq.'))
          rows = rows.filter((row) => row.status === filter.match(/status\.eq\.([a-z_]+)/)![1]);
        else throw new Error('Unexpected test filter');
      }
      const total = rows.length,
        offset = Number(url.searchParams.get('offset') ?? 0),
        limit = Number(url.searchParams.get('limit') ?? 25);
      return route.fulfill({
        status: 200,
        headers: {
          'content-range': `0-${Math.max(0, total - 1)}/${total}`,
          'content-type': 'application/json',
          'access-control-expose-headers': 'content-range',
        },
        body: request.method() === 'HEAD' ? '' : JSON.stringify(rows.slice(offset, offset + limit)),
      });
    }
    if (name === 'admin_supplier_detail')
      return route.fulfill({
        json: {
          business: {
            id: bid,
            owner_id: 'a1000000-0000-4000-8000-000000000099',
            name: 'Synthetic Textile Works',
            contact_phone: '+8801812345678',
            district: 'Gazipur',
            division: 'Dhaka',
          },
        },
      });
    if (name === 'admin_list') {
      const body = request.postDataJSON();
      const owner = body.filters.id === 'a1000000-0000-4000-8000-000000000099';
      return route.fulfill({
        json: {
          total: 1,
          rows: [
            {
              id: body.filters.id,
              full_name: owner ? 'Synthetic Store Owner' : 'Synthetic Buyer',
              phone: owner ? '+8801812345678' : null,
            },
          ],
        },
      });
    }
    return route.fallback();
  });
  return {
    calls,
    requests,
    recover: () => {
      fail = false;
    },
    oid,
  };
}
