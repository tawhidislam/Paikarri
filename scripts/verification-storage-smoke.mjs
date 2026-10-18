// Opt-in cloud integration check. Uses only the existing synthetic supplier account.
// Keeps an empty draft for that account; never submits or approves an application.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };
if (env.ALLOW_VERIFICATION_STORAGE_SMOKE !== '1')
  throw new Error('Opt in with ALLOW_VERIFICATION_STORAGE_SMOKE=1.');
const credentials = JSON.parse(readFileSync('.env.test-supplier', 'utf8'));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options);
const guest = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options);
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const rpc = async (name, args) => {
  const result = await client.rpc(name, args);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data;
};
const login = await client.auth.signInWithPassword({
  email: credentials.email,
  password: credentials.password,
});
check(
  !login.error && login.data.user?.id === credentials.user_id,
  'Synthetic account sign-in failed.',
);
let current = await rpc('verification_start');
check(
  current.business.name.startsWith('[TEST]') &&
    current.application.status === 'draft' &&
    current.files.length === 0 &&
    current.identity.document_number === '',
  'Use only an empty synthetic supplier draft.',
);
const path = `${login.data.user.id}/${current.application.id}/identity_front/${randomUUID()}.png`;
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZioAAAAASUVORK5CYII=',
  'base64',
);
let attached;
try {
  const upload = await client.storage
    .from('business-documents')
    .upload(path, pixel, { contentType: 'image/png', upsert: false });
  check(!upload.error, `Synthetic upload failed: ${upload.error?.message}`);
  const overwrite = await client.storage
    .from('business-documents')
    .upload(path, pixel, { contentType: 'image/png', upsert: true });
  check(!!overwrite.error, 'Evidence overwrites must be denied.');
  current = await rpc('verification_attach_file', {
    target: current.application.id,
    expected_version: current.application.lock_version,
    slot: 'identity_front',
    object_path: path,
  });
  attached = current.files.find((file) => file.object_path === path);
  check(!!attached, 'Evidence attachment missing.');
  const signed = await client.storage.from('business-documents').createSignedUrl(path, 300);
  check(!signed.error && !!signed.data?.signedUrl, 'Owner signed preview failed.');
  const preview = await fetch(signed.data.signedUrl);
  check(
    preview.ok && (await preview.arrayBuffer()).byteLength === pixel.length,
    'Private preview download failed.',
  );
  const denied = await guest.storage.from('business-documents').createSignedUrl(path, 300);
  check(!!denied.error, 'Guest must not sign private evidence.');
  console.log(
    'Cloud storage passed: draft upload, attachment, overwrite denial, owner preview, guest denial.',
  );
} finally {
  if (attached)
    await rpc('verification_remove_file', {
      target: current.application.id,
      expected_version: current.application.lock_version,
      file_id: attached.id,
    });
  const removed = await client.storage.from('business-documents').remove([path]);
  check(!removed.error, 'Synthetic file cleanup failed.');
  await client.auth.signOut();
}
console.log(
  'Synthetic evidence removed; empty test-account draft retained. No application submitted or supplier verified.',
);
