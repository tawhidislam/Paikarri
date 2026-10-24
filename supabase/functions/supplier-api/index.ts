import { createClient } from '@supabase/supabase-js';
import {
  ApiError,
  createSupplierApi,
  type Backend,
  type ObjectData,
} from '../_shared/supplier-api/handler.ts';
import { inspectUpload } from '../_shared/supplier-api/upload-validation.ts';

const string = (value: unknown) => {
  if (typeof value !== 'string' || !value)
    throw new ApiError(500, 'INVALID_ASSET', 'Asset metadata is unavailable.');
  return value;
};
const handler = createSupplierApi({
  async authenticate(request): Promise<Backend> {
    const url = Deno.env.get('SUPABASE_URL')!,
      key = Deno.env.get('SUPABASE_ANON_KEY')!;
    const client = createClient(url, key, {
      global: { headers: { Authorization: request.headers.get('authorization')! } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user)
      throw new ApiError(401, 'UNAUTHENTICATED', 'Your session expired. Sign in again.');
    // Service credentials are confined to verified upload finalization and authorized cleanup.
    const service = () =>
      createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    return {
      userId: user.id,
      async rpc(name, args = {}) {
        const { data, error } = await client.rpc(name, args);
        if (error) throw error;
        return data;
      },
      async one(table, columns, match) {
        const { data, error } = await client.from(table).select(columns).match(match).maybeSingle();
        if (error) throw error;
        return data;
      },
      async rows(table, columns, match = {}) {
        const { data, error } = await client
          .from(table)
          .select(columns)
          .match(match)
          .order('id')
          .limit(1000);
        if (error) throw error;
        return data ?? [];
      },
      async signUpload(ticket) {
        if (
          ticket.discarded ||
          ticket.attached ||
          Date.parse(string(ticket.expires_at)) <= Date.now()
        )
          throw new ApiError(409, 'UPLOAD_UNAVAILABLE', 'Prepare a new upload.');
        const { data, error } = await client.storage
          .from(string(ticket.bucket))
          .createSignedUploadUrl(string(ticket.path), { upsert: false });
        if (error) throw error;
        return {
          upload_url: data.signedUrl,
          upload_token: data.token,
          upload_method: 'PUT',
          expires_at: ticket.expires_at,
        };
      },
      async verifyUpload(ticket: ObjectData) {
        if (ticket.discarded || Date.parse(string(ticket.expires_at)) <= Date.now())
          throw new ApiError(409, 'UPLOAD_UNAVAILABLE', 'Prepare a new upload.');
        const { data: blob, error } = await client.storage
          .from(string(ticket.bucket))
          .download(string(ticket.path));
        if (error || !blob)
          throw new ApiError(422, 'UPLOAD_MISSING', 'Upload the file before completing it.');
        if (blob.size !== Number(ticket.size) || blob.size > 10485760)
          throw new ApiError(422, 'INVALID_FILE', 'The uploaded file size does not match.');
        try {
          inspectUpload(
            new Uint8Array(await blob.arrayBuffer()),
            string(ticket.mime),
            string(ticket.purpose),
            Number(ticket.size),
            ticket.width as number | undefined,
            ticket.height as number | undefined,
          );
        } catch {
          throw new ApiError(422, 'INVALID_FILE', 'File contents do not match the upload profile.');
        }
        const { error: finalError } = await service().rpc('supplier_api_upload_verified', {
          target: ticket.id,
          actor: user.id,
        });
        if (finalError) throw finalError;
      },
      async removeFile(asset) {
        // bucket/path originate exclusively from an ownership-authorized database command.
        const { error } = await service()
          .storage.from(string(asset.bucket))
          .remove([string(asset.path)]);
        if (error)
          throw new ApiError(
            503,
            'CLEANUP_PENDING',
            'The attachment was removed. Retry to clean up its private file.',
          );
      },
      async signRead(asset) {
        const { data, error } = await client.storage
          .from(string(asset.bucket))
          .createSignedUrl(string(asset.path), 300);
        if (error) throw error;
        return { url: data.signedUrl, expires_at: new Date(Date.now() + 300000).toISOString() };
      },
    };
  },
  log(event) {
    console.info(JSON.stringify(event));
  },
});
Deno.serve(handler);
