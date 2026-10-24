// Service-only maintenance; only expired, unattached mobile tickets are returned by the RPC.
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret)
  throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY for the intended cloud project.');
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.rpc('supplier_api_upload_gc');
if (error) throw error;
let removed = 0;
for (const file of data ?? []) {
  const { error } = await db.storage.from(file.bucket).remove([file.path]);
  if (error) throw new Error('Private upload cleanup failed; retry this maintenance command.');
  removed++;
}
const { error: ackError } = await db.rpc('supplier_api_upload_gc_ack', {
  targets: (data ?? []).map((file) => file.id),
});
if (ackError) throw ackError;
console.log(JSON.stringify({ removed }));
