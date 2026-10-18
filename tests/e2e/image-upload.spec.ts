import { test, expect } from '@playwright/test';
test('real browser compresses images, preserves alpha, and uses readable document dimensions', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/lib/image-upload.ts';
    const { prepareImageUpload } = await import(path);
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext('2d')!;
    const data = context.createImageData(canvas.width, canvas.height);
    let seed = 123;
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data.data[i] = seed & 255;
      data.data[i + 1] = (seed >>> 8) & 255;
      data.data[i + 2] = (seed >>> 16) & 255;
      data.data[i + 3] = i % 16 === 0 ? 0 : 255;
    }
    context.putImageData(data, 0, 0);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png'),
    );
    const source = new File([blob], 'synthetic.png', { type: 'image/png' });
    const product = await prepareImageUpload(source, 'product-images');
    const avatar = await prepareImageUpload(source, 'avatars');
    const documentImage = await prepareImageUpload(source, 'business-documents');
    const dimensions = async (file: File) => {
      const bitmap = await createImageBitmap(file);
      const size = [bitmap.width, bitmap.height];
      bitmap.close();
      return size;
    };
    const small = new File(
      [
        await new Promise<Blob>((resolve) => {
          canvas.width = 1;
          canvas.height = 1;
          canvas.toBlob((b) => resolve(b!), 'image/png');
        }),
      ],
      'tiny.png',
      { type: 'image/png' },
    );
    const efficient = await prepareImageUpload(small, 'avatars');
    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = 512;
    alphaCanvas.height = 384;
    const alphaContext = alphaCanvas.getContext('2d')!;
    const bitmap = await createImageBitmap(avatar);
    alphaContext.drawImage(bitmap, 0, 0);
    bitmap.close();
    return {
      source: source.size,
      product: product.size,
      avatar: avatar.size,
      document: documentImage.size,
      type: product.type,
      name: product.name,
      productDimensions: await dimensions(product),
      avatarDimensions: await dimensions(avatar),
      documentDimensions: await dimensions(documentImage),
      smallNeverEnlarged: efficient.size <= small.size,
      hasTransparency: alphaContext
        .getImageData(0, 0, 512, 384)
        .data.some((v, i) => i % 4 === 3 && v < 255),
    };
  });
  expect(result.product).toBeLessThan(result.source);
  expect(result.avatar).toBeLessThan(result.product);
  expect(result.document).toBeLessThan(result.source);
  expect(result.type).toBe('image/webp');
  expect(result.name).toBe('synthetic.webp');
  expect(result.productDimensions).toEqual([1920, 1440]);
  expect(result.avatarDimensions).toEqual([512, 384]);
  expect(result.documentDimensions).toEqual([2400, 1800]);
  expect(result.smallNeverEnlarged).toBe(true);
  expect(result.hasTransparency).toBe(true);
});
