import { z } from 'zod';
import { db } from './supabase';
export const suggestionsSchema = z.object({
  products: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        name_bn: z.string(),
        price: z.number(),
        unit: z.string(),
        moq: z.number(),
        stock: z.number(),
        supplier_name: z.string(),
        supplier_name_bn: z.string(),
        image: z.string().nullable(),
      }),
    )
    .max(6),
  categories: z
    .array(z.object({ id: z.uuid(), name: z.string(), name_bn: z.string(), slug: z.string() }))
    .max(4),
});
export function normalizeSearch(value: string) {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().slice(0, 160);
}
export const searchHref = (value: string) => {
  const q = normalizeSearch(value);
  return q ? `/products?q=${encodeURIComponent(q)}` : '/products';
};
export async function searchSuggestions(keyword: string, signal?: AbortSignal) {
  const term = normalizeSearch(keyword);
  if ([...term].length < 2) return { products: [], categories: [] };
  const request = db().rpc('search_suggestions', { keyword: term });
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  return suggestionsSchema.parse(data);
}
