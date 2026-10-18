import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { catalogHtml } from '../server/catalog-html.js';
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end();
    return;
  }
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'production')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.searchParams.get('path') ?? url.pathname;
    const template = await readFile(join(process.cwd(), 'dist/index.html'), 'utf8');
    const result = await catalogHtml(template, path, process.env);
    res.statusCode = result.status;
    res.end(req.method === 'HEAD' ? undefined : result.html);
  } catch {
    res.statusCode = 503;
    res.end(
      req.method === 'HEAD'
        ? undefined
        : '<!doctype html><title>Temporarily unavailable</title><p>Please try again shortly.</p>',
    );
  }
}
