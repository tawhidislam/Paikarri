// Optional server maintenance: removes only abandoned, unsent images >24h old.
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!key || !env.VITE_SUPABASE_URL)
  throw new Error('Set the server-only Supabase secret and project URL.');
const client = createClient(env.VITE_SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let removed = 0;
for (let page = 0; page < 20; page++) {
  const { data, error } = await client.rpc('chat_image_gc_candidates');
  if (error) throw new Error('Could not load abandoned image candidates.');
  if (!Array.isArray(data) || !data.length) break;
  const { error: storageError } = await client.storage
    .from('chat-images')
    .remove(data.map((f) => f.path));
  if (storageError) throw new Error('Storage cleanup failed; retry later.');
  const { error: dbError } = await client
    .from('chat_images')
    .delete()
    .in(
      'id',
      data.map((f) => f.id),
    )
    .eq('discarded', true);
  if (dbError) throw new Error('Image metadata cleanup failed; retry later.');
  removed += data.length;
  if (data.length < 100) break;
}
console.log(`Removed ${removed} abandoned chat images. Sent messages and images were preserved.`);
