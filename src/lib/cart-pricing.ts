import type { ProductOptions } from './buying';
import { selectedPrice } from './buying';
import type { CartRow } from './order-schema';

// Preview only complete, valid product selections. Server quotes authorize saved prices.
export function previewCartRows(
  rows: CartRow[],
  drafts: Record<string, number>,
  options: Map<string, ProductOptions>,
) {
  const proposed = rows.map((row) => ({
    ...row,
    quantity: drafts[row.sku_id ?? row.product_id] ?? row.quantity,
  }));
  const valid = new Map<string, boolean>();
  for (const row of rows) {
    if (valid.has(row.product_id)) continue;
    const lines = proposed.filter((line) => line.product_id === row.product_id);
    const total = lines.reduce((sum, line) => sum + line.quantity, 0);
    valid.set(
      row.product_id,
      lines.some((line) => (line.sku_id ?? line.product_id) in drafts) &&
        total >= row.moq &&
        total <= 1000000 &&
        lines.every(
          (line) =>
            Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= line.stock,
        ),
    );
  }
  return proposed.map((row, index) => {
    if (!valid.get(row.product_id)) return rows[index];
    const product = options.get(row.product_id);
    const active = product?.skus.filter((sku) => sku.active) ?? [];
    const sku = row.sku_id
      ? active.find((sku) => sku.id === row.sku_id)
      : active.length === 1 && !product?.attributes.length
        ? active[0]
        : undefined;
    const total = proposed
      .filter((line) => line.product_id === row.product_id)
      .reduce((sum, line) => sum + line.quantity, 0);
    return sku ? { ...row, unit_price: selectedPrice(sku, total) } : rows[index];
  });
}
