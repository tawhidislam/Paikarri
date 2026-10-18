import { createClient } from 'npm:@supabase/supabase-js@2';
import { providerStatus, type ProviderCapability } from '../_shared/provider-contracts.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Cache-Control': 'no-store' };
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405, headers });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
  const { data: role } = await client.from('user_roles').select('role').eq('user_id', user.id).single();
  if (role?.role !== 'super_admin') return Response.json({ error: 'Super admin required' }, { status: 403, headers });
  let capability: unknown;
  try { ({ capability } = await req.json()); } catch { return Response.json({ error: 'Invalid request' }, { status: 400, headers }); }
  if (!['courier', 'sms', 'web_push', 'mfs', 'escrow', 'milestones'].includes(String(capability))) return Response.json({ error: 'Unknown capability' }, { status: 400, headers });
  return Response.json(providerStatus(capability as ProviderCapability), { status: 503, headers });
});
