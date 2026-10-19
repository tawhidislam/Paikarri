import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function money(value: number, locale = 'en') {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
    const messages = error.issues.flatMap((issue: unknown) =>
      issue && typeof issue === 'object' && 'message' in issue && typeof issue.message === 'string'
        ? [issue.message]
        : [],
    );
    if (messages.length) return [...new Set(messages)].join(' ');
  }
  return error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : 'Something went wrong. Please try again.';
}
export function safeRedirect(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/dashboard';
}
export function validateUpload(
  file: File,
  bucket:
    | 'product-images'
    | 'business-documents'
    | 'avatars'
    | 'request-attachments'
    | 'chat-images'
    | 'store-images',
) {
  const types =
    bucket === 'business-documents' || bucket === 'request-attachments'
      ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      : ['image/jpeg', 'image/png', 'image/webp'];
  const max =
    bucket === 'business-documents' || bucket === 'request-attachments'
      ? 10
      : bucket === 'chat-images'
        ? 1
        : bucket === 'avatars'
          ? 2
          : 5;
  if (bucket === 'chat-images' && file.type !== 'image/webp')
    throw new Error('Chat images must be compressed WebP files.');
  if (bucket === 'store-images' && (file.type !== 'image/webp' || file.size > 256 * 1024))
    throw new Error('Store pictures must be optimized WebP images up to 256 KB.');
  if (!types.includes(file.type))
    throw new Error(
      'Unsupported file type. Use ' + types.map((x) => x.split('/')[1]).join(', ') + '.',
    );
  if (file.size > max * 1024 * 1024) throw new Error(`File must be smaller than ${max} MB.`);
  if (file.size === 0) throw new Error('The file is empty.');
  return file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
}

export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
      const n = Number(c);
      return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16);
    });
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const generateUUID = randomUUID;

// Polyfill crypto.randomUUID for environments where it is missing (e.g. non-HTTPS, Safari < 15.4, mobile WebKit)
if (typeof globalThis !== 'undefined' && globalThis.crypto && !globalThis.crypto.randomUUID) {
  try {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: randomUUID,
      configurable: true,
      writable: true,
    });
  } catch {
    try {
      (globalThis.crypto as unknown as { randomUUID: () => string }).randomUUID = randomUUID;
    } catch {
      // ignore
    }
  }
}
