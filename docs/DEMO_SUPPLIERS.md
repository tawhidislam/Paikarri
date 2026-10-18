# Local testing suppliers

The user requested a second fictional supplier and products for both existing test accounts on the linked development Supabase Cloud project.

- `test.supplier@paikari.example`: existing `[TEST] Paikari Demo Supplier`; its existing profile and verification application are preserved.
- `test.supplier2@paikari.example`: `[TEST] Paikari Homeware Supplier`, Chattogram; starts unverified.

Passwords and account IDs are saved in the gitignored, owner-readable `.env.demo-suppliers` file. Do not commit it. These reserved test addresses do not receive email; the new test account's email is confirmed during creation so password login can be exercised.

Each account has three `[DEMO]` products with English/Bangla names, stock, MOQ, three pricing tiers, and an uploaded compressed WebP category illustration. The listing descriptions explicitly identify fictional offers and illustrative photographs. Two products per account are approved for public marketplace testing; one remains pending for moderation testing. These records are real hosted test fixtures, not frontend mock responses. No verification is granted by the fixture script.

`ALLOW_DEMO_PRODUCTS=1 node scripts/demo-supplier-products.mjs` resumes creation for these exact two accounts. It identifies products by a stable Demo SKU, avoids duplicate products/images, and never approves listings itself. Approval is a separate audited administrative operation. Supplier edits/images may return an approved listing to pending under normal moderation rules.

Migration 19 fixes an existing image-upload policy name-scope bug: the nested product query must reference `storage.objects.name` rather than the product's `name` column. Ownership, product-path checks, and account suspension restrictions remain enforced. `supabase/tests/product_upload.sql` exercises valid uploads and rejects other-owner, other-product, nonexistent-product, and suspended-account paths with rolled-back synthetic fixtures.

Before a real public launch, review/archive demo listings through normal account/admin controls. Do not delete test accounts if they have acquired conversations or other history that needs preservation.
