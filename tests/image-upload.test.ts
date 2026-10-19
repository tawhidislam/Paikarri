import { describe, expect, it } from 'vitest';
import { fittedDimensions, prepareImageUpload, imageUploadProfiles } from '../src/lib/image-upload';
describe('upload compression boundaries', () => {
  it('fits landscape/portrait images and never upscales', () => {
    expect(fittedDimensions(4000, 2000, 1920)).toEqual({ width: 1920, height: 960 });
    expect(fittedDimensions(2000, 4000, 3200)).toEqual({ width: 1600, height: 3200 });
    expect(fittedDimensions(100, 200, 512)).toEqual({ width: 100, height: 200 });
    expect(() => fittedDimensions(0, 200, 512)).toThrow();
  });
  it('keeps a higher resolution and quality floor for sensitive documents', () => {
    expect(imageUploadProfiles['business-documents'].maxDimension).toBeGreaterThan(
      imageUploadProfiles['product-images'].maxDimension,
    );
    expect(imageUploadProfiles['business-documents'].minimumQuality).toBeGreaterThanOrEqual(0.9);
  });
  it('preserves trade PDFs unchanged and rejects PDFs for product images', async () => {
    const pdf = new File(['synthetic'], 'licence.pdf', { type: 'application/pdf' });
    expect(await prepareImageUpload(pdf, 'business-documents')).toBe(pdf);
    await expect(prepareImageUpload(pdf, 'product-images')).rejects.toThrow();
  });
  it('rejects unsafe, empty and oversized sources before decoding', async () => {
    await expect(
      prepareImageUpload(new File(['x'], 'unsafe.svg', { type: 'image/svg+xml' }), 'avatars'),
    ).rejects.toThrow();
    await expect(
      prepareImageUpload(new File([], 'empty.png', { type: 'image/png' }), 'avatars'),
    ).rejects.toThrow();
    await expect(
      prepareImageUpload({ type: 'image/png', size: 21 * 1024 * 1024 } as File, 'product-images'),
    ).rejects.toThrow();
  });
  it('uses a bounded store logo profile and rejects non-image inputs', async () => {
    expect(imageUploadProfiles['store-images'].maxDimension).toBe(512);
    await expect(
      prepareImageUpload(
        new File(['pdf'], 'picture.pdf', { type: 'application/pdf' }),
        'store-images',
      ),
    ).rejects.toThrow();
  });
});
