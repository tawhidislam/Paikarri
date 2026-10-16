import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function money(value: number, locale = 'en') {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value);
}
export function errorMessage(error: unknown) {
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
  bucket: 'product-images' | 'business-documents' | 'avatars',
) {
  const types =
    bucket === 'business-documents'
      ? ['application/pdf', 'image/jpeg', 'image/png']
      : ['image/jpeg', 'image/png', 'image/webp'];
  const max = bucket === 'business-documents' ? 10 : bucket === 'avatars' ? 2 : 5;
  if (!types.includes(file.type))
    throw new Error(
      'Unsupported file type. Use ' + types.map((x) => x.split('/')[1]).join(', ') + '.',
    );
  if (file.size > max * 1024 * 1024) throw new Error(`File must be smaller than ${max} MB.`);
  if (file.size === 0) throw new Error('The file is empty.');
  return file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
}
