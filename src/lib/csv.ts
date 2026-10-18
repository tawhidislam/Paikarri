import { productSchema } from './validation';
export const productColumns = [
  'name',
  'name_bn',
  'description',
  'category_slug',
  'price',
  'moq',
  'stock',
  'unit',
  'specifications',
  'tiers',
] as const;
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '');
  if (text.length > 2097152) throw new Error('CSV must be at most 2 MB.');
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || field === '') quoted = !quoted;
      else throw new Error('Invalid CSV quote.');
    } else if (c === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote.');
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
}
export function csvText(rows: unknown[][]) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? '');
            if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(','),
      )
      .join('\r\n')
  );
}
export function downloadCsv(filename: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function validateProductCsv(text: string, categories: { id: string; slug: string }[]) {
  const [headers, ...rows] = parseCsv(text);
  if (!headers || headers.join(',') !== productColumns.join(','))
    throw new Error('Use the supplied CSV template headers.');
  if (rows.length < 1 || rows.length > 100) throw new Error('Import between 1 and 100 products.');
  return rows.map((row, index) => {
    try {
      if (row.length !== headers.length) throw new Error('Column count does not match.');
      const v = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
      const category = categories.find((c) => c.slug === v.category_slug);
      if (!category) throw new Error('Unknown category slug.');
      const product = productSchema.parse({
        ...v,
        category_id: category.id,
        price: Number(v.price),
        moq: Number(v.moq),
        stock: Number(v.stock),
        specifications: JSON.parse(v.specifications || '{}'),
        tiers: JSON.parse(v.tiers || '[]'),
      });
      return { row: index + 2, product, error: null };
    } catch (error) {
      return {
        row: index + 2,
        product: null,
        error: error instanceof Error ? error.message : 'Invalid row',
      };
    }
  });
}
