import { describe, it, expect } from 'vitest';
import { inspectChatImage } from '../supabase/functions/_shared/chat-image-validation';
import { prepareImageUpload } from '../src/lib/image-upload';
function webp(width = 100, height = 80) {
  const b = new Uint8Array(30);
  const v = new DataView(b.buffer);
  const tag = (s: string, n: number) => [...s].forEach((c, i) => (b[n + i] = c.charCodeAt(0)));
  tag('RIFF', 0);
  v.setUint32(4, 22, true);
  tag('WEBP', 8);
  tag('VP8 ', 12);
  v.setUint32(16, 10, true);
  b[23] = 0x9d;
  b[24] = 1;
  b[25] = 0x2a;
  v.setUint16(26, width, true);
  v.setUint16(28, height, true);
  return b;
}
describe('private chat image limits', () => {
  it('checks actual WebP container and frame dimensions', () => {
    expect(inspectChatImage(webp())).toEqual({ width: 100, height: 80 });
    expect(() => inspectChatImage(webp(1601, 80))).toThrow();
    expect(() => inspectChatImage(webp(0, 80))).toThrow();
  });
  it('rejects disguised, truncated, oversized and metadata-bearing images', () => {
    expect(() =>
      inspectChatImage(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),
    ).toThrow();
    expect(() => inspectChatImage(webp().slice(0, 25))).toThrow();
    expect(() => inspectChatImage(new Uint8Array(1048577))).toThrow();
    const metadata = webp();
    metadata.set(new TextEncoder().encode('EXIF'), 12);
    expect(() => inspectChatImage(metadata)).toThrow();
  });
  it('rejects PDFs and unsupported originals before compression', async () => {
    await expect(
      prepareImageUpload(
        new File(['synthetic'], 'file.pdf', { type: 'application/pdf' }),
        'chat-images',
      ),
    ).rejects.toThrow();
    await expect(
      prepareImageUpload(new File(['svg'], 'file.svg', { type: 'image/svg+xml' }), 'chat-images'),
    ).rejects.toThrow();
  });
});
