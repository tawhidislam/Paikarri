import { deploymentConfig } from './deployment.mjs';
// Uses only anonymous public catalog RPCs. Never use a secret key here.
export const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export async function catalogHtml(
  template: string,
  path: string,
  env: Record<string, string | undefined>,
  fetcher: typeof fetch = fetch,
) {
  const match = /^\/(products|suppliers)\/([0-9a-f-]{36})\/?$/i.exec(path);
  if (!match) return { status: 404, html: template };
  const endpoint = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!endpoint || !key) return { status: 503, html: template };
  const product = match[1] === 'products';
  try {
    const deployment = deploymentConfig(env);
    const response = await fetcher(
      `${endpoint}/rest/v1/rpc/${product ? 'public_products' : 'public_businesses'}?id=eq.${encodeURIComponent(match[2])}&limit=1`,
      {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(4000),
        cache: 'no-store',
      },
    );
    if (!response.ok) return { status: 503, html: template };
    const rows = await response.json();
    const record = Array.isArray(rows) ? rows[0] : null;
    const origin = new URL(deployment.site);
    if (!['https:', 'http:'].includes(origin.protocol)) throw new Error('Invalid site URL');
    const canonical = `${origin.origin}/${match[1]}/${match[2]}`;
    const name = record ? String(record.name) : 'Listing unavailable';
    const description = record
      ? String(record.description ?? '').slice(0, 300)
      : 'This listing is not currently available on Paikarii.com.';
    const schema = record
      ? {
          '@context': 'https://schema.org',
          '@type': product ? 'Product' : 'Organization',
          name,
          description,
          url: canonical,
          ...(product
            ? {
                sku: record.id,
                offers: {
                  '@type': 'Offer',
                  priceCurrency: 'BDT',
                  price: record.price,
                  url: canonical,
                  availability:
                    Number(record.stock) > 0
                      ? 'https://schema.org/InStock'
                      : 'https://schema.org/OutOfStock',
                },
              }
            : {
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: record.district,
                  addressCountry: 'BD',
                },
              }),
        }
      : null;
    const metadata = `<link rel="canonical" href="${escapeHtml(canonical)}"/><meta property="og:title" content="${escapeHtml(name)} | Paikarii.com"/><meta property="og:description" content="${escapeHtml(description)}"/>${!record ? '<meta name="robots" content="noindex"/>' : ''}${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>` : ''}`;
    const content = `<main class="container page-content"><h1>${escapeHtml(name)}</h1><p>${escapeHtml(description)}</p>${record && product ? `<p>BDT ${escapeHtml(record.price)} · Minimum quantity: ${escapeHtml(record.moq)} ${escapeHtml(record.unit)}</p>` : ''}<a href="/products">Browse wholesale products</a></main>`;
    return {
      status: record ? 200 : 404,
      html: template
        .replace(
          /<title>[\s\S]*?<\/title>/i,
          () => `<title>${escapeHtml(name)} | Paikarii.com</title>`,
        )
        .replace(
          /<meta name="description"[^>]*\/>/i,
          () => `<meta name="description" content="${escapeHtml(description)}"/>`,
        )
        .replace('</head>', () => `${metadata}</head>`)
        .replace('<div id="root"></div>', () => `<div id="root">${content}</div>`),
    };
  } catch {
    return { status: 503, html: template };
  }
}
