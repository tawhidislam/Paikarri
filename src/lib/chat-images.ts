import { z } from 'zod';
import { db } from './supabase';
import { prepareImageUpload } from './image-upload';
export const chatImageDb = db;
// Files remain in memory while composing; never store image bytes or URLs in localStorage.
export type ChatImageDraft = { id: string; file: File };
export async function uploadChatImage(
  conversation: string,
  original: File,
): Promise<ChatImageDraft> {
  const file = await prepareImageUpload(original, 'chat-images');
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width,
    height = bitmap.height;
  bitmap.close();
  const { data, error } = await chatImageDb().rpc('chat_image_prepare', {
    target: conversation,
    file_size: file.size,
    image_width: width,
    image_height: height,
  });
  if (error) throw error;
  const prepared = z.object({ id: z.uuid(), path: z.string() }).parse(data);
  try {
    const { error: uploadError } = await db()
      .storage.from('chat-images')
      .upload(prepared.path, file, {
        contentType: 'image/webp',
        upsert: false,
        cacheControl: '300',
      });
    if (uploadError) throw uploadError;
    const { data: verified, error: verifyError } = await db().functions.invoke('chat-image', {
      body: { id: prepared.id, action: 'verify' },
    });
    if (verifyError || !verified?.verified)
      throw new Error('Image verification failed. Please try again.');
    return { id: prepared.id, file };
  } catch (error) {
    await discardChatImage(prepared.id).catch(() => undefined);
    throw error;
  }
}
export async function discardChatImage(id: string) {
  const { data, error } = await db().functions.invoke('chat-image', {
    body: { id, action: 'discard' },
  });
  if (error || !data?.removed) throw new Error('Image removal failed. Please retry.');
}
export async function chatImageUrl(id: string, monitorAccess?: string) {
  const { data, error } = await db().functions.invoke('chat-image', {
    body: { id, action: 'read', ...(monitorAccess ? { monitor_access: monitorAccess } : {}) },
  });
  if (error) throw new Error('Image unavailable. Please retry.');
  return z
    .object({ url: z.url(), width: z.number().positive(), height: z.number().positive() })
    .parse(data);
}
