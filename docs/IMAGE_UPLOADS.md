# Automatic image compression

New product, avatar, homepage hero and verification image uploads use `src/lib/image-upload.ts` before sending bytes to Supabase Storage. Database rows continue storing file references. Existing objects are not rewritten.

| Upload                     | Long-edge resize limit | WebP quality range | Preferred size |
| -------------------------- | ---------------------- | ------------------ | -------------- |
| Products and homepage hero | 1920 px                | 0.76–0.84          | 600 KiB        |
| Avatars                    | 512 px                 | 0.76–0.84          | 120 KiB        |
| Verification images        | 3200 px                | 0.90–0.94          | 1500 KiB       |

Preferred sizes are targets, not guarantees. Detailed verification images retain the higher quality floor to protect fine print; suppliers must preview documents and check readability. Images are never upscaled. If encoding would increase the file size, the original is retained. WebP preserves transparency and the browser applies EXIF orientation during decoding. PDFs bypass compression and remain limited to trade-licence evidence in the verification workflow.

Product/hero/avatar source images can be up to 20 MiB; verification sources remain limited to 10 MiB. Decoded images over 40 megapixels are rejected. Existing post-compression bucket limits still apply: 5 MiB for products/hero, 2 MiB for avatars, 10 MiB for documents. MIME, ownership, draft-only upload rules and unique paths continue to be enforced. This optimization supplements server validation; it does not replace it. Browsers without WebP encoding retain the original when it meets the existing upload limits.

Checks cover portrait/landscape fitting, no upscaling, PDF passthrough, unsafe sources, document quality floors and real desktop/mobile canvas encoding, size reduction and transparency. No new backend service or migration is needed.
