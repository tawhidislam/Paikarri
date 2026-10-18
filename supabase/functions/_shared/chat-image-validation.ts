// Static WebP RIFF/container validation; no animated or metadata chunks accepted.
// https://developers.google.com/speed/webp/docs/riff_container
export function inspectChatImage(bytes: Uint8Array) {
  const bad = () => {
    throw new Error('Use a valid compressed WebP image up to 1 MB and 1600 pixels.');
  };
  if (bytes.length < 20 || bytes.length > 1048576) return bad();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (n: number) => String.fromCharCode(...bytes.subarray(n, n + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WEBP' || view.getUint32(4, true) + 8 !== bytes.length)
    return bad();
  let width = 0,
    height = 0,
    canvasWidth = 0,
    canvasHeight = 0,
    frames = 0;
  for (let at = 12; at < bytes.length;) {
    if (at + 8 > bytes.length) return bad();
    const kind = tag(at),
      size = view.getUint32(at + 4, true),
      data = at + 8;
    if (data + size > bytes.length) return bad();
    if (kind === 'VP8X') {
      if (size !== 10 || (bytes[data] & 2) !== 0) return bad();
      const u24 = (n: number) => bytes[n] + bytes[n + 1] * 256 + bytes[n + 2] * 65536;
      canvasWidth = u24(data + 4) + 1;
      canvasHeight = u24(data + 7) + 1;
    } else if (kind === 'VP8 ') {
      if (
        size < 10 ||
        (bytes[data] & 1) !== 0 ||
        bytes[data + 3] !== 0x9d ||
        bytes[data + 4] !== 1 ||
        bytes[data + 5] !== 0x2a
      )
        return bad();
      width = view.getUint16(data + 6, true) & 0x3fff;
      height = view.getUint16(data + 8, true) & 0x3fff;
      frames++;
    } else if (kind === 'VP8L') {
      if (size < 5 || bytes[data] !== 0x2f) return bad();
      const bits = view.getUint32(data + 1, true);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
      frames++;
    } else if (kind !== 'ALPH') return bad();
    at = data + size + (size % 2);
    if (at > bytes.length) return bad();
  }
  if (
    frames !== 1 ||
    width < 1 ||
    height < 1 ||
    width > 1600 ||
    height > 1600 ||
    (canvasWidth && (canvasWidth !== width || canvasHeight !== height))
  )
    return bad();
  return { width, height };
}

// Canvas encoders may add an ICC profile. Our canvas uses sRGB; discard profiles
// and EXIF/XMP chunks so no source metadata or location data reaches storage.
export function stripChatImageMetadata(bytes: Uint8Array) {
  if (
    bytes.length < 20 ||
    String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' ||
    String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP'
  )
    throw new Error('Invalid compressed image.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) + 8 !== bytes.length) throw new Error('Invalid compressed image.');
  const chunks: Uint8Array[] = [];
  for (let at = 12; at < bytes.length;) {
    if (at + 8 > bytes.length) throw new Error('Invalid compressed image.');
    const kind = String.fromCharCode(...bytes.subarray(at, at + 4)),
      size = view.getUint32(at + 4, true),
      end = at + 8 + size + (size % 2);
    if (end > bytes.length) throw new Error('Invalid compressed image.');
    if (!['ICCP', 'EXIF', 'XMP '].includes(kind)) {
      const chunk = bytes.slice(at, end);
      if (kind === 'VP8X') chunk[8] &= ~(0x20 | 0x08 | 0x04);
      chunks.push(chunk);
    }
    at = end;
  }
  const output = new Uint8Array(12 + chunks.reduce((n, c) => n + c.length, 0));
  output.set(bytes.subarray(0, 12));
  new DataView(output.buffer).setUint32(4, output.length - 8, true);
  let position = 12;
  for (const chunk of chunks) {
    output.set(chunk, position);
    position += chunk.length;
  }
  inspectChatImage(output);
  return output;
}
