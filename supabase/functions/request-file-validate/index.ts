import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
Deno.serve(async req => {
 if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
 try {
  if (req.method !== 'POST') throw new Error('POST required');
  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) return Response.json({ error: 'Sign in required' }, { status: 401, headers: cors });
  const { id } = await req.json();
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid attachment');
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: f, error } = await service.from('sourcing_files').select('id,path,mime,size,request_id').eq('id', id).single();
  if (error || !f) throw new Error('Attachment unavailable');
  const { data: r } = await service.from('sourcing_requests').select('buyer_id').eq('id', f.request_id).single();
  if (r?.buyer_id !== user.id) return Response.json({ error: 'Attachment unavailable' }, { status: 403, headers: cors });
  const { data: blob, error: downloadError } = await auth.storage.from('request-attachments').download(f.path);
  if (downloadError || !blob || blob.size !== f.size || blob.size > 10485760) throw new Error('Invalid file size');
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const starts = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  const kind = starts(0xff,0xd8,0xff) ? 'image/jpeg' : starts(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a) ? 'image/png' : starts(0x25,0x50,0x44,0x46,0x2d) ? 'application/pdf' : new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP' ? 'image/webp' : '';
  if (kind !== f.mime) throw new Error('File contents do not match the selected type');
  const { error: finalError } = await service.rpc('sourcing_file_finalize', { target: id, actor: user.id });
  if (finalError) throw finalError;
  return Response.json({ verified: true }, { headers: cors });
 } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'File validation failed' }, { status: 400, headers: cors }); }
});
