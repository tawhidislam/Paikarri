// Shared by Vite, sitemap generation, and the server-only catalog renderer.
export function deploymentConfig(env = {}) {
  for (const name of Object.keys(env)) {
    if (
      /^VITE_.*(?:SECRET|SERVICE_ROLE|PASSWORD|ACCESS_TOKEN|PRIVATE_KEY)/i.test(name) &&
      env[name]
    )
      throw new Error(`Remove ${name}: server credentials must not use the VITE_ prefix.`);
  }
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
  let role;
  try {
    role = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()).role;
  } catch {
    /* Publishable keys are not JWTs. */
  }
  if (key.startsWith('sb_secret_') || role === 'service_role')
    throw new Error(
      'VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable/anon key, never a secret key.',
    );
  const cloud = env.VERCEL === '1';
  if (cloud && (!env.VITE_SUPABASE_URL || !key))
    throw new Error(
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel Environment Variables, then redeploy.',
    );
  if (env.VITE_SUPABASE_URL) {
    const url = new URL(env.VITE_SUPABASE_URL);
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('VITE_SUPABASE_URL must be the HTTPS URL of the hosted Supabase project.');
  }
  const host =
    env.VERCEL_ENV === 'production'
      ? env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL
      : env.VERCEL_URL;
  const configured = (env.VITE_SITE_URL ?? '').trim();
  const url = new URL(configured || (host ? `https://${host}` : 'http://localhost:5173'));
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'VITE_SITE_URL must be a site origin, without credentials, a path, query, or fragment.',
    );
  if (cloud && (local || url.protocol !== 'https:'))
    throw new Error(
      'VITE_SITE_URL must use your HTTPS Vercel/custom domain. Remove a localhost value to use Vercel automatic URLs.',
    );
  return { site: url.origin, indexable: !local && (!cloud || env.VERCEL_ENV === 'production') };
}
