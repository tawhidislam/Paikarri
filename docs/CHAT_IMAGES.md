# Private compressed chat images

Buyers and suppliers can use **Attach image** in full-page or floating chat. One image per message; captions are optional. JPEG, PNG and WebP sources up to 20 MB are accepted. The client always re-encodes to static WebP, fits within 1600 × 1600 pixels, aims for 450 KB and enforces a maximum stored size of 1 MB. It strips ICC, EXIF and XMP chunks; original files are not uploaded. Compression may reduce fine text: send legible photos and inspect the preview.

Files live in private Supabase Storage `chat-images`, not as binary data in PostgreSQL. Messages contain an image ID; PostgreSQL stores bounded metadata. A cloud Edge Function checks Auth identity, uploader ownership, actual size, WebP container/frame dimensions and declared metadata before marking an attachment ready. File extensions/MIME labels alone do not establish readiness. This is format validation, not an antivirus scan.

Participants can view sent images. Draft images are owner-only. Staff and unrelated accounts cannot read them. Super-admin monitoring uses the existing audited conversation opening; each image URL request adds `conversation_monitor.image_accessed` without copying contact details or paths into the audit record. URLs expire after five minutes; the viewer refreshes them while visible and provides manual retry on image failure. Previously issued URLs retain their remaining lifetime.

Uploads use unique non-overwritable paths. Verified images can be sent only by their uploader into their original conversation and can attach to only one message. Retried sends reuse the nonce. Removing an unsent preview marks the upload discarded before deleting storage bytes. Sent messages/images cannot be replaced or removed through this feature. Composing files/URLs remain in memory, not browser localStorage. Text and image drafts survive conversation switching/minimization within the current session; a page reload does not preserve them.

## Hosted rollout

```sh
supabase db push --linked --dry-run
supabase db push --linked
supabase functions deploy chat-image --use-api
npm run db:types
supabase db query --linked --file supabase/tests/chat_images.sql --output json
```

`verify_jwt=false` in the function configuration supports current hosted signing keys; the function still calls `auth.getUser()` on every request. The service key is read from Supabase Edge Function secrets only, never from the browser. No Docker/local database or frontend deployment is needed.

## Abandoned uploads

Failure paths attempt to discard incomplete files. Closing/reloading during an upload can leave an abandoned private image. Run server maintenance periodically (for example daily from a trusted scheduler):

```sh
node scripts/cleanup-chat-images.mjs
```

Set `SUPABASE_SECRET_KEY` (or the legacy server service-role key) and `VITE_SUPABASE_URL` in the server environment. Never use a client build environment to run this maintenance task. It marks up to 100 unsent uploads older than 24 hours at a time, removes their Storage objects, then their metadata, processing at most 2,000 records per invocation. Sent images are excluded and protected against races by row locks and the message guard. The cleanup script is provided; no external scheduler has been activated. Preview removal immediately deletes its storage bytes, with small discarded metadata left for this maintenance task.

References: [private Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [WebP container format](https://developers.google.com/speed/webp/docs/riff_container).

## Release validation

- Migration 35 applied to the existing hosted project; `chat-image` deployed with API bundling (no Docker/local database).
- Pre/post-rollout SQL tests passed for private paths, readiness, participant/outsider/staff access, idempotent sends, and audited super-admin access.
- 78 unit tests passed; 44 desktop/mobile chat, monitoring and compression browser checks passed. An additional 8 attachment checks passed against the final previews and generated cloud interfaces.
- A live synthetic 70-byte WebP upload passed the deployed validator. Overwrite and unsent shared viewing were denied; the test file was removed, with no message sent.
- Optional abandoned-upload maintenance is provided but not scheduled automatically.
