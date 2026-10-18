import { prepareImageUpload } from './image-upload';
import { randomUUID } from './utils';
import { z } from 'zod';
import type { Json } from './database.types';
import { db } from './supabase';
import {
  detailSchema,
  stateSchema,
  progressSchema,
  decisionSchema,
  type VerificationStep,
  type VerificationDetail,
} from './verification-schema';
export async function verificationState() {
  const { data, error } = await db().rpc('verification_state');
  if (error) throw error;
  return stateSchema.parse(data);
}
export async function verificationGet(id: string) {
  const { data, error } = await db().rpc('verification_get', { target: z.uuid().parse(id) });
  if (error) throw error;
  return detailSchema.parse(data);
}
export async function startVerification() {
  const { data, error } = await db().rpc('verification_start');
  if (error) throw error;
  return detailSchema.parse(data);
}
export async function saveVerificationStep(
  detail: VerificationDetail,
  step: VerificationStep,
  values: unknown,
) {
  const payload = Object.fromEntries(
    Object.entries(values as Record<string, unknown>).map(([k, v]) => [
      k,
      ['dob', 'issued_on', 'expires_on'].includes(k) && v === '' ? null : v,
    ]),
  ) as Json;
  const { data, error } = await db().rpc('verification_save_step', {
    target: detail.application.id,
    expected_version: detail.application.lock_version,
    step,
    payload,
  });
  if (error) throw error;
  return detailSchema.parse(data);
}
export async function uploadVerificationFile(
  detail: VerificationDetail,
  slot: string,
  file: File,
  userId: string,
) {
  const allowed =
    slot === 'trade_license'
      ? ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      : ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024)
    throw new Error('Use an allowed file type, up to 10 MB.');
  const prepared = await prepareImageUpload(file, 'business-documents');
  const ext =
    prepared.type === 'application/pdf'
      ? 'pdf'
      : prepared.type === 'image/jpeg'
        ? 'jpg'
        : prepared.type.split('/')[1];
  const path = `${userId}/${detail.application.id}/${slot}/${randomUUID()}.${ext}`;
  const uploaded = await db()
    .storage.from('business-documents')
    .upload(path, prepared, { contentType: prepared.type, upsert: false });
  if (uploaded.error) throw uploaded.error;
  const { data, error } = await db().rpc('verification_attach_file', {
    target: detail.application.id,
    expected_version: detail.application.lock_version,
    slot,
    object_path: path,
  });
  if (error) {
    await db().storage.from('business-documents').remove([path]);
    throw error;
  }
  return detailSchema.parse(data);
}
export async function removeVerificationFile(detail: VerificationDetail, fileId: string) {
  const file = detail.files.find((f) => f.id === fileId);
  const { data, error } = await db().rpc('verification_remove_file', {
    target: detail.application.id,
    expected_version: detail.application.lock_version,
    file_id: fileId,
  });
  if (error) throw error;
  // A cloned historical file remains immutable. Only new draft uploads may be removed.
  if (file?.object_path.split('/')[1] === detail.application.id) {
    const removed = await db().storage.from('business-documents').remove([file.object_path]);
    if (removed.error) {
      /* Detached draft objects stay private; server metadata is authoritative. */
    }
  }
  return detailSchema.parse(data);
}
export async function submitVerification(detail: VerificationDetail, declaration: boolean) {
  const { data, error } = await db().rpc('verification_submit', {
    target: detail.application.id,
    expected_version: detail.application.lock_version,
    declaration,
  });
  if (error) throw error;
  return detailSchema.parse(data);
}
export async function listVerifications(
  filters: Record<string, string>,
  page: number,
  size: number,
) {
  const { data, error } = await db().rpc('verification_list', {
    filters,
    page,
    page_size: size,
  });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(progressSchema) }).parse(data);
}
export async function decideVerification(
  detail: VerificationDetail,
  payload: z.infer<typeof decisionSchema>,
) {
  const value = decisionSchema.parse(payload);
  const { data, error } = await db().rpc('verification_decide', {
    target: detail.application.id,
    expected_version: detail.application.lock_version,
    payload: value as Json,
  });
  if (error) throw error;
  return detailSchema.parse(data);
}
