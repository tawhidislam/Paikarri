# Branded order receipts

Open an authorized order detail page and choose **Print order**, then choose **Save as PDF** in the browser. The screen layout stays interactive; print media shows only the dedicated receipt. Buyer, supplier and super-admin order views use the same receipt component and existing order authorization.

`src/components/order/receipt.tsx` prints a vector Paikarii.com logo, current public platform contact details when configured, frozen order reference/date, status, supplier and recipient, item/variant quantities and prices, delivery charge, totals, notes and authorized payment records. It does not invent tax details or imply payment has been collected. Pending delivery charges and totals are marked provisional. English/Bangla copy is centralized in `src/lib/receipt-copy.ts`.

`receipt.css` uses A4 page margins, repeated table headers, unsplit item rows and page counters. Dashboard navigation, floating chat, action controls and interactive dialogs are excluded. Local font loading completes before the print dialog opens, and the inline logo has no external image dependency.

Verification: TypeScript, lint, the production build and 51 unit tests passed. The receipt/order/buyer-page browser run passed 45 cases with three intentionally duplicated desktop-only PDF/viewport cases skipped on mobile. Synthetic English and Bangla receipts each fit one A4 page. A 35-item stress receipt renders four pages, repeats the table headers, and retains every item and the provisional totals. All six generated pages were rendered and visually inspected with no clipping, missing glyphs or dashboard content. PDF structure/bounds checks are in `artifacts/order-receipt-pdf-check.json`.

The preview PDFs in `output/pdf/` contain fictional browser fixtures. No real order was changed and no PDF containing a customer's real delivery address was saved during development. No new backend service or database migration is required.
