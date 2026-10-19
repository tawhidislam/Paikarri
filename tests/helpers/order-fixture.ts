import type { Page } from '@playwright/test';
import { chatFixture, uid, bid, pid } from './chat-fixture';
import type { CartRow, OrderDetail } from '../../src/lib/order-schema';
export const oid = '71000000-0000-4000-8000-000000000001';
export async function orderFixture(
  page: Page,
  {
    role = 'buyer',
    locale = 'en',
    status = 'awaiting_acceptance',
    payment = 'unpaid',
    method = 'cod',
    twoSuppliers = false,
    conflict = false,
    fail = false,
    failCheckoutOnce = false,
    returnStatus = '',
    keepExpiry = false,
    reportedReference = '',
    tracking = '',
  } = {},
) {
  await chatFixture(page, { role, locale });
  const calls: { name: string; body: Record<string, unknown> }[] = [];
  let rows: CartRow[] = [
    {
      product_id: pid,
      business_id: bid,
      supplier_name: 'Synthetic Textile Works',
      name: 'Synthetic cotton shirt',
      name_bn: 'পরীক্ষামূলক সুতি শার্ট',
      unit: 'piece',
      quantity: 100,
      moq: 100,
      stock: 1000,
      unit_price: 185,
      available: true,
    },
  ];
  if (twoSuppliers)
    rows.push({
      ...rows[0],
      product_id: '64000000-0000-4000-8000-000000000002',
      business_id: '62000000-0000-4000-8000-000000000002',
      supplier_name: 'Synthetic Homeware',
      name: 'Synthetic chair',
      name_bn: 'পরীক্ষামূলক চেয়ার',
      quantity: 10,
      moq: 10,
      unit_price: 1450,
    });
  let order: OrderDetail = {
    purchase_kind: 'wholesale',
    id: oid,
    number: 101,
    buyer_id: role === 'buyer' ? uid : 'a1000000-0000-4000-8000-000000000001',
    business_id: bid,
    supplier_name: 'Synthetic Textile Works',
    buyer_name: 'Synthetic Buyer',
    status: status as OrderDetail['status'],
    payment_status: payment as OrderDetail['payment_status'],
    payment_method: method as OrderDetail['payment_method'],
    subtotal: 18500,
    shipping_fee: 500,
    total: 19000,
    shipping_address: {
      name: 'Synthetic Receiver',
      phone: '01712345678',
      division: 'Dhaka',
      district: 'Dhaka',
      address: '10 Synthetic Road Dhaka',
    },
    buyer_note: 'Size mix: medium and large',
    supplier_note: 'Dispatch within two days',
    cancellation_requested: false,
    version: 2,
    expires_at: keepExpiry || status === 'awaiting_acceptance' ? '2099-10-20T05:00:00Z' : null,
    completed_at: null,
    created_at: '2026-10-17T03:00:00Z',
    updated_at: '2026-10-17T04:00:00Z',
    items: [
      {
        id: '72000000-0000-4000-8000-000000000001',
        product_id: pid,
        name: 'Synthetic cotton shirt',
        name_bn: 'পরীক্ষামূলক সুতি শার্ট',
        unit: 'piece',
        quantity: 100,
        unit_price: 185,
        line_total: 18500,
      },
    ],
    events: [
      {
        id: '73000000-0000-4000-8000-000000000001',
        actor_role: 'buyer',
        action: 'placed',
        note: '',
        from_status: null,
        to_status: 'pending_confirmation',
        created_at: '2026-10-17T03:00:00Z',
      },
    ],
    shipments: tracking
      ? [
          {
            id: '76000000-0000-4000-8000-000000000001',
            carrier: 'Synthetic Courier',
            tracking_number: tracking,
            shipped_at: '2026-10-17T04:00:00Z',
          },
        ]
      : [],
    returns: returnStatus
      ? [
          {
            id: '74000000-0000-4000-8000-000000000001',
            status: returnStatus as 'authorized' | 'in_transit' | 'received',
            authorized_at: '2026-10-17T04:00:00Z',
            carrier: returnStatus === 'in_transit' ? 'Synthetic Return Courier' : null,
            tracking_number: returnStatus === 'in_transit' ? 'RETURN-123' : null,
            dispatched_at: null,
            received_at: null,
            restocked: false,
          },
        ]
      : [],
    payments: reportedReference
      ? [
          {
            id: '77000000-0000-4000-8000-000000000001',
            kind: 'payment_report',
            amount: 19000,
            reference: reportedReference,
            created_at: '2026-10-17T04:00:00Z',
          },
        ]
      : [],
    disputes:
      status === 'disputed'
        ? [
            {
              id: '75000000-0000-4000-8000-000000000001',
              reason: 'Synthetic damaged goods',
              previous_status: 'shipped',
              opened_at: '2026-10-17T04:00:00Z',
              resolution: null,
              resolution_note: null,
              resolved_at: null,
            },
          ]
        : [],
  };
  await page.route('**/rest/v1/rpc/*', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!;
    if (
      ![
        'product_options',
        'cart_quote',
        'cart_set',
        'order_checkout',
        'order_list',
        'order_detail',
        'order_action',
      ].includes(name)
    ) {
      await route.fallback();
      return;
    }
    const body = route.request().postDataJSON() ?? {};
    calls.push({ name, body });
    if (
      name === 'order_checkout' &&
      failCheckoutOnce &&
      calls.filter((c) => c.name === 'order_checkout').length === 1
    ) {
      await route.fulfill({
        status: 400,
        json: { message: 'Checkout interrupted. Please retry.' },
      });
      return;
    }
    if (fail) {
      await route.fulfill({ status: 503, json: { message: 'Orders temporarily unavailable' } });
      return;
    }
    let data: unknown;
    if (name === 'product_options') {
      const row = rows.find((r) => r.product_id === body.target) ?? rows[0];
      const homeware = body.target !== pid;
      data = {
        sourcing: {
          product_id: body.target,
          preparation_min: 1,
          preparation_max: 7,
          dispatch_location: '',
          packaging: '',
          delivery_notes: '',
          samples_enabled: false,
          sample_limit: 1,
          customization_enabled: false,
          customization_moq: homeware ? 10 : 100,
          estimates_updated_at: null,
          version: 1,
        },
        attributes: [],
        skus: [
          {
            id: body.target,
            code: 'STANDARD',
            stock: row?.stock ?? 1000,
            active: true,
            image_id: null,
            version: 1,
            options: {},
            prices: homeware
              ? [{ min_quantity: 1, price: 1450 }]
              : [
                  { min_quantity: 1, price: 185 },
                  { min_quantity: 500, price: 170 },
                ],
          },
        ],
      };
    }
    if (name === 'cart_quote') data = { rows };
    if (name === 'cart_set') {
      rows = rows.flatMap((r) =>
        r.product_id !== body.product
          ? [r]
          : Number(body.quantity) === 0
            ? []
            : [
                {
                  ...r,
                  quantity: Number(body.quantity),
                  unit_price: Number(body.quantity) >= 500 ? 170 : r.unit_price,
                },
              ],
      );
      data = null;
    }
    if (name === 'order_checkout') {
      rows = [];
      order = { ...order, status: 'pending_confirmation' };
      data = { ids: twoSuppliers ? [oid, '71000000-0000-4000-8000-000000000002'] : [oid] };
    }
    if (name === 'order_list')
      data = {
        total: 1,
        rows: [order],
        counts: {
          open: 1,
          disputed: status === 'disputed' ? 1 : 0,
          refund_pending: payment === 'refund_pending' ? 1 : 0,
        },
      };
    if (name === 'order_detail') data = order;
    if (name === 'order_action') {
      if (conflict) {
        await route.fulfill({
          status: 409,
          json: { message: 'Order changed. Refresh before trying again', code: '40001' },
        });
        return;
      }
      const payload = body.payload as Record<string, unknown>;
      const action = String(body.action);
      const transition: Record<string, OrderDetail['status']> = {
        confirm: 'awaiting_acceptance',
        accept: 'processing',
        ship: 'shipped',
        receive: 'completed',
        cancel: 'cancelled',
        dispute: 'disputed',
        resolve_cancel: 'cancelled',
        resolve_resume: 'processing',
        resolve_complete: 'completed',
      };
      order = { ...order, status: transition[action] ?? order.status, version: order.version + 1 };
      if (action === 'confirm')
        order = {
          ...order,
          shipping_fee: Number(payload.shipping_fee),
          total: order.subtotal + Number(payload.shipping_fee),
        };
      if (action === 'ship')
        order.shipments = [
          {
            id: crypto.randomUUID(),
            carrier: String(payload.carrier),
            tracking_number: String(payload.tracking_number),
            shipped_at: new Date().toISOString(),
          },
        ];
      if (action === 'authorize_return')
        order.returns = [
          {
            id: crypto.randomUUID(),
            status: 'authorized',
            authorized_at: new Date().toISOString(),
            carrier: null,
            tracking_number: null,
            dispatched_at: null,
            received_at: null,
            restocked: false,
          },
        ];
      if (action === 'return_ship') {
        order.returns[0] = {
          ...order.returns[0],
          status: 'in_transit',
          carrier: String(payload.carrier),
          tracking_number: String(payload.tracking_number),
          dispatched_at: new Date().toISOString(),
        };
      }
      if (action === 'return_received') {
        order.returns[0] = {
          ...order.returns[0],
          status: 'received',
          received_at: new Date().toISOString(),
          restocked: !!payload.restock,
        };
      }
      if (action === 'request_cancel') order.cancellation_requested = true;
      if (action === 'decline_cancel') order.cancellation_requested = false;
      if (action === 'report_payment') order.payment_status = 'reported';
      if (action === 'confirm_payment') order.payment_status = 'paid';
      if (action === 'confirm_refund') order.payment_status = 'refunded';
      order.events.push({
        id: crypto.randomUUID(),
        actor_role: role,
        action,
        note: String(payload.note ?? ''),
        from_status: status,
        to_status: order.status,
        created_at: new Date().toISOString(),
      });
      data = order;
    }
    await route.fulfill({ json: data });
  });
  return Object.assign(calls, { getOrder: () => order });
}
