import type { Page } from '@playwright/test';
export const uid = '190b6f2a-5dd6-44f3-ae10-3a9a567d7fb5',
  bid = '62000000-0000-4000-8000-000000000001',
  cid = '63000000-0000-4000-8000-000000000001',
  other = '63000000-0000-4000-8000-000000000002',
  buyer = 'a1000000-0000-4000-8000-000000000001',
  pid = '64000000-0000-4000-8000-000000000001';
export const product = {
  id: pid,
  name: 'Synthetic cotton shirt',
  name_bn: 'Synthetic BN shirt',
  price: 185,
  moq: 100,
  unit: 'piece',
};
export async function chatFixture(
  page: Page,
  {
    locale = 'en',
    role = 'supplier',
    empty = false,
    failSend = false,
    older = false,
    unread = 0,
  } = {},
) {
  const calls: { name: string; method: string; body: Record<string, unknown> }[] = [];
  const messages = [
    {
      id: '65000000-0000-4000-8000-000000000001',
      conversation_id: cid,
      sender_id: buyer,
      body: 'Can you supply 500 cotton shirts?',
      created_at: '2026-10-17T03:00:00Z',
      product_snapshot: product,
    },
    {
      id: '65000000-0000-4000-8000-000000000002',
      conversation_id: cid,
      sender_id: uid,
      body: 'Yes, available in bulk. Which sizes do you need?',
      created_at: '2026-10-17T03:03:00Z',
      product_snapshot: null,
    },
  ];
  const thread = (id = cid) => ({
    id,
    business_id: role === 'buyer' && id === other ? '62000000-0000-4000-8000-000000000002' : bid,
    buyer_id: role === 'buyer' ? uid : id === cid ? buyer : 'b2000000-0000-4000-8000-000000000001',
    supplier_id: role === 'buyer' ? buyer : uid,
    business_name:
      role === 'buyer' && id === other ? 'Meghna Packaging Works' : 'Synthetic Textile Works',
    business_name_bn:
      role === 'buyer' && id === other ? 'মেঘনা প্যাকেজিং' : 'Synthetic BN supplier',
    buyer_name: id === cid ? 'Buyer #A1000000' : 'Buyer #B2000000',
    verified: true,
    supplier_status: 'active',
    created_at: '2026-10-16T02:00:00Z',
    latest:
      id === cid
        ? messages.at(-1)
        : {
            body: 'Please share your wholesale price list.',
            sender_id: buyer,
            created_at: '2026-10-15T03:00:00Z',
          },
    unread_count: unread,
    peer_read_at: messages.at(-1)!.created_at,
    peer_read_id: messages.at(-1)!.id,
  });
  const of = (rows: typeof messages, more = false) => ({
    rows,
    has_more: more,
    oldest: rows.length ? { id: rows[0].id, created_at: rows[0].created_at } : null,
    newest: rows.length ? { id: rows.at(-1)!.id, created_at: rows.at(-1)!.created_at } : null,
  });
  await page.addInitScript(
    ({ uid, locale, role }) => {
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem('paikari-locale', locale);
      if (role === 'guest') return;
      localStorage.setItem(
        'sb-zhllnfciehxmjahljrhb-auth-token',
        JSON.stringify({
          access_token: `${btoa('{}')}.${btoa(JSON.stringify({ sub: uid, role: 'authenticated', exp: now + 3600 }))}.test`,
          refresh_token: 'synthetic',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: now + 3600,
          user: {
            id: uid,
            email: 'synthetic@example.invalid',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: { provider: 'email' },
            user_metadata: {},
            created_at: '2026-10-17T00:00:00Z',
          },
        }),
      );
    },
    { uid, locale, role },
  );
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const req = route.request(),
      name = new URL(req.url()).pathname.split('/').pop()!,
      body = req.postDataJSON() ?? {};
    calls.push({ name, method: req.method(), body });
    let data: unknown;
    if (name === 'user_roles') data = { role };
    else if (name === 'get_account_status') data = { status: 'active', reason: '' };
    else if (name === 'notification_unread_count') data = 0;
    else if (name === 'get_platform_settings')
      data = {
        name_en: 'Paikarii.com',
        name_bn: 'পাইকারি',
        tagline_en: 'Wholesale',
        tagline_bn: 'পাইকারি',
        support_email: 'support@example.invalid',
        support_phone: '01700000000',
        default_locale: locale,
        supplier_registration_open: true,
      };
    else if (name === 'product_options')
      data = {
        sourcing: {
          product_id: pid,
          preparation_min: 1,
          preparation_max: 7,
          dispatch_location: '',
          packaging: '',
          delivery_notes: '',
          samples_enabled: false,
          sample_limit: 1,
          customization_enabled: false,
          customization_moq: 100,
          estimates_updated_at: null,
          version: 1,
        },
        attributes: [],
        skus: [
          {
            id: pid,
            code: 'STANDARD',
            stock: 5000,
            active: true,
            image_id: null,
            version: 1,
            options: {},
            prices: [{ min_quantity: 1, price: 185 }],
          },
        ],
      };
    else if (name === 'product_reviews_read')
      data = { total: 0, rating: null, count: 0, sample_count: 0, rows: [] };
    else if (name === 'my_product_review') data = { review: null, orders: [] };
    else if (name === 'chat_unread_total') data = unread;
    else if (name === 'chat_list') {
      let rows = empty ? [] : [thread(), thread(other)];
      if (body.search)
        rows = rows.filter((t) =>
          JSON.stringify(t).toLowerCase().includes(String(body.search).toLowerCase()),
        );
      if (body.unread_only) rows = rows.filter((t) => t.unread_count > 0);
      data = { total: rows.length, rows };
    } else if (name === 'chat_thread') {
      if (![cid, other].includes(body.target)) {
        await route.fulfill({
          status: 403,
          json: { code: '42501', message: 'Conversation access denied' },
        });
        return;
      }
      data = thread(body.target);
    } else if (name === 'chat_start')
      data = { thread: thread(), product: body.product ? product : null };
    else if (name === 'chat_mark_read') data = null;
    else if (name === 'chat_messages') {
      if (body.before_cursor)
        data = of([
          {
            ...messages[0],
            id: '65000000-0000-4000-8000-000000000000',
            body: 'Earlier inquiry from last week',
            created_at: '2026-10-10T03:00:00Z',
          },
        ]);
      else if (body.after_cursor) {
        const cursor = body.after_cursor as { created_at: string; id: string };
        data = of(
          messages.filter(
            (m) =>
              m.created_at > cursor.created_at ||
              (m.created_at === cursor.created_at && m.id > cursor.id),
          ),
        );
      } else data = of(messages, older);
    } else if (name === 'chat_send') {
      if (failSend) {
        await route.fulfill({
          status: 429,
          json: { message: 'Rate limit exceeded. Try again shortly.' },
        });
        return;
      }
      const message = {
        id: '65000000-0000-4000-8000-' + String(messages.length + 1).padStart(12, '0'),
        conversation_id: body.target,
        sender_id: uid,
        body: body.body,
        created_at: '2026-10-17T03:05:00Z',
        product_snapshot: body.product ? product : null,
      };
      messages.push(message as (typeof messages)[number]);
      data = message;
    } else if (name === 'public_products')
      data = [
        {
          id: pid,
          business_id: bid,
          category_id: '66000000-0000-4000-8000-000000000001',
          name: product.name,
          name_bn: product.name_bn,
          price: 185,
          moq: 100,
          stock: 5000,
          unit: 'piece',
          description: 'Synthetic product for browser testing only.',
          specifications: { Material: 'Cotton' },
          status: 'approved',
          created_at: '2026-10-17T03:00:00Z',
          updated_at: '2026-10-17T03:00:00Z',
        },
      ];
    else if (name === 'public_businesses')
      data = [
        {
          id: bid,
          owner_id: buyer,
          name: 'Synthetic Textile Works',
          name_bn: 'Synthetic BN supplier',
          division: 'Dhaka',
          district: 'Dhaka',
          verified: true,
          description: 'Synthetic test supplier',
          address: 'Synthetic location',
          contact_phone: '',
          website: '',
          created_at: '2026-10-17T03:00:00Z',
          updated_at: '2026-10-17T03:00:00Z',
          verification_application_id: null,
        },
      ];
    else data = [];
    if (name === 'public_products' && req.headers()['accept']?.includes('vnd.pgrst.object'))
      data = (data as unknown[])[0] ?? null;
    await route.fulfill({ json: data });
  });
  return calls;
}
