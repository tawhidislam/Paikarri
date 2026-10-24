import { inspectChatImage } from '../chat-image-validation.ts';
/** Content checks supplement bucket MIME/size enforcement. PDFs are not malware-scanned. */
export function inspectUpload(
  bytes: Uint8Array,
  mime: string,
  purpose: string,
  expectedSize: number,
  width?: number,
  height?: number,
) {
  if (bytes.length !== expectedSize || !bytes.length)
    throw new Error('Uploaded size does not match');
  const starts = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  const tag = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (mime === 'application/pdf') {
    if (purpose !== 'verification' || !starts(0x25, 0x50, 0x44, 0x46, 0x2d))
      throw new Error('Invalid PDF');
    return;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let w = 0,
    h = 0;
  if (
    mime === 'image/png' &&
    starts(137, 80, 78, 71, 13, 10, 26, 10) &&
    bytes.length >= 33 &&
    tag(12) === 'IHDR'
  ) {
    w = view.getUint32(16);
    h = view.getUint32(20);
  } else if (mime === 'image/jpeg' && starts(255, 216, 255)) {
    for (let at = 2; at + 4 < bytes.length;) {
      if (bytes[at] !== 255) throw new Error('Invalid JPEG');
      const marker = bytes[at + 1];
      at += 2;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xff) {
        at--;
        continue;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const size = view.getUint16(at);
      if (size < 2 || at + size > bytes.length) throw new Error('Invalid JPEG');
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        ) &&
        size >= 8
      ) {
        h = view.getUint16(at + 3);
        w = view.getUint16(at + 5);
        break;
      }
      at += size;
    }
  } else if (
    mime === 'image/webp' &&
    tag(0) === 'RIFF' &&
    tag(8) === 'WEBP' &&
    bytes.length >= 20 &&
    view.getUint32(4, true) + 8 === bytes.length
  ) {
    if (purpose === 'chat' || purpose === 'store') {
      const dimensions = inspectChatImage(bytes);
      w = dimensions.width;
      h = dimensions.height;
    } else {
      for (let at = 12; at + 8 <= bytes.length;) {
        const kind = tag(at),
          size = view.getUint32(at + 4, true),
          data = at + 8;
        if (data + size > bytes.length) throw new Error('Invalid WebP');
        if (
          kind === 'VP8 ' &&
          size >= 10 &&
          bytes[data + 3] === 0x9d &&
          bytes[data + 4] === 1 &&
          bytes[data + 5] === 0x2a
        ) {
          w = view.getUint16(data + 6, true) & 0x3fff;
          h = view.getUint16(data + 8, true) & 0x3fff;
        }
        if (kind === 'VP8L' && size >= 5 && bytes[data] === 0x2f) {
          const bits = view.getUint32(data + 1, true);
          w = (bits & 0x3fff) + 1;
          h = ((bits >>> 14) & 0x3fff) + 1;
        }
        if (kind === 'ANIM' || kind === 'ANMF') throw new Error('Animated images are unsupported');
        at = data + size + (size % 2);
      }
    }
  }
  if (!w || !h || w * h > 40000000) throw new Error('File contents do not match a supported image');
  if (purpose === 'store' && (w > 512 || h > 512)) throw new Error('Store images must fit 512px');
  if (purpose === 'chat' && (w !== width || h !== height))
    throw new Error('Image dimensions do not match');
  return { width: w, height: h };
}
