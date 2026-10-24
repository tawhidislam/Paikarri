import { z } from 'zod';
import { growthDb } from './growth';
import {
  tenderSummary,
  tenderDetail,
} from '../../supabase/functions/_shared/supplier-api/tender-schema';
export * from '../../supabase/functions/_shared/supplier-api/tender-schema';
export async function tenderList(view_kind = 'open', search = '', page = 1, category?: string) {
  const { data, error } = await growthDb().rpc('tender_list', {
    view_kind,
    search,
    page,
    page_size: 25,
    category,
  });
  if (error) throw error;
  return z.object({ total: z.number(), rows: z.array(tenderSummary) }).parse(data);
}
export async function tenderRead(target: string) {
  const { data, error } = await growthDb().rpc('tender_detail', { target });
  if (error) throw error;
  return tenderDetail.parse(data);
}
