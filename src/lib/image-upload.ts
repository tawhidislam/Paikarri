import { stripChatImageMetadata } from '../../supabase/functions/_shared/chat-image-validation';
import { validateUpload } from './utils';
export type ImageUploadKind =
  | 'product-images'
  | 'avatars'
  | 'business-documents'
  | 'request-attachments'
  | 'chat-images'
  | 'store-images';
// Documents use a conservative quality floor to keep fine print readable.
export const imageUploadProfiles = {
  'store-images': {
    maxDimension: 512,
    quality: 0.84,
    minimumQuality: 0.72,
    targetBytes: 120 * 1024,
  },
  'chat-images': {
    maxDimension: 1600,
    quality: 0.8,
    minimumQuality: 0.65,
    targetBytes: 450 * 1024,
  },
  'product-images': {
    maxDimension: 1920,
    quality: 0.84,
    minimumQuality: 0.76,
    targetBytes: 600 * 1024,
  },
  avatars: { maxDimension: 512, quality: 0.84, minimumQuality: 0.76, targetBytes: 120 * 1024 },
  'request-attachments': {
    maxDimension: 2400,
    quality: 0.9,
    minimumQuality: 0.84,
    targetBytes: 1000 * 1024,
  },
  'business-documents': {
    maxDimension: 3200,
    quality: 0.94,
    minimumQuality: 0.9,
    targetBytes: 1500 * 1024,
  },
} as const;
export function fittedDimensions(width: number, height: number, limit: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1)
    throw new Error('The image could not be read.');
  const scale = Math.min(1, limit / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
function encode(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be compressed.'))),
      'image/webp',
      quality,
    ),
  );
}
export async function prepareImageUpload(file: File, kind: ImageUploadKind): Promise<File> {
  if (file.type === 'application/pdf') {
    validateUpload(file, kind); // PDFs are only accepted for business documents.
    return file;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Use a JPEG, PNG or WebP image.');
  if (!file.size) throw new Error('The file is empty.');
  const sourceLimit = kind === 'business-documents' ? 10 : 20;
  if (file.size > sourceLimit * 1024 * 1024)
    throw new Error(`Choose an image up to ${sourceLimit} MB.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('The image could not be read. Choose another image.');
  }
  const canvas = document.createElement('canvas');
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error('Choose an image smaller than 40 megapixels.');
    const profile = imageUploadProfiles[kind];
    const dimensions = fittedDimensions(bitmap.width, bitmap.height, profile.maxDimension);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is unavailable in this browser.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let result = await encode(canvas, profile.quality);
    if (result.type === 'image/webp' && result.size > profile.targetBytes) {
      const smaller = await encode(canvas, profile.minimumQuality);
      if (smaller.size < result.size) result = smaller;
    }
    if (kind === 'chat-images' || kind === 'store-images') {
      // Always re-encode chat images: remove source metadata and enforce bounded storage.
      const maximum = kind === 'store-images' ? 256 * 1024 : 1024 * 1024;
      for (let attempt = 0; result.size > maximum && attempt < 4; attempt++) {
        canvas.width = Math.max(1, Math.floor(canvas.width * 0.8));
        canvas.height = Math.max(1, Math.floor(canvas.height * 0.8));
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        result = await encode(canvas, profile.minimumQuality);
      }
      if (result.type !== 'image/webp')
        throw new Error('WebP image compression is unavailable in this browser.');
      const clean = stripChatImageMetadata(new Uint8Array(await result.arrayBuffer()));
      const compressed = new File(
        [clean.buffer],
        kind === 'store-images' ? 'store-picture.webp' : 'chat-image.webp',
        { type: 'image/webp' },
      );
      validateUpload(compressed, kind);
      return compressed;
    }
    // Never enlarge an already efficient image. Unsupported WebP encoders retain the original.
    const prepared =
      result.type === 'image/webp' && result.size < file.size
        ? new File([result], file.name.replace(/\.[^.]+$/, '') + '.webp', {
            type: 'image/webp',
            lastModified: file.lastModified,
          })
        : file;
    validateUpload(prepared, kind); // Existing cloud bucket limits still apply after compression.
    return prepared;
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
