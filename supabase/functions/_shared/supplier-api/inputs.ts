import { z } from 'zod';
import { businessSchema, productSchema } from './validation.ts';
import { skuSchema, sourcingSchema } from './buying-schema.ts';
import { shippingSchema } from './shipping.ts';
import { identityDraft, tradeDraft, bankDraft } from './verification-schema.ts';
import { actionSchema, validateOrderAction } from './order-schema.ts';

export const uuid = z.uuid();
export const empty = z.strictObject({});
export const version = z.number().int().min(1);
export const expectedTimestamp = z.iso.datetime({ offset: true });
const price = z
  .number()
  .positive()
  .max(999999999999)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.0001,
    'Use at most two decimal places',
  );
const productValues = productSchema.safeExtend({ price });
export const businessInput = businessSchema.strict();
// PATCH sends a complete editable value object, making cross-field validation unambiguous.
export const businessUpdate = z.strictObject({
  expected_updated_at: expectedTimestamp,
  values: businessSchema.strict(),
});
export const productInput = productValues.strict();
export const productUpdate = z.strictObject({
  expected_updated_at: expectedTimestamp,
  values: z
    .strictObject(productValues.shape)
    .omit({ stock: true })
    .refine((v) => new Set(v.tiers.map((t) => t.min_quantity)).size === v.tiers.length, {
      message: 'Tier quantities must be unique',
      path: ['tiers'],
    }),
});
export const timestampInput = z.strictObject({ expected_updated_at: expectedTimestamp });
export const profileInput = z
  .strictObject({
    full_name: z.string().trim().min(2).max(120).optional(),
    phone: z.union([z.string().regex(/^\+?8801[3-9][0-9]{8}$/), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one profile field');
export const shippingInput = z.strictObject({
  expected_version: z.number().int().nonnegative(),
  values: shippingSchema,
});
const skuInput = skuSchema.omit({ id: true }).extend({
  id: uuid.optional(),
  code: z.string().trim().min(1).max(80),
  options: z
    .record(z.string().min(1).max(60), z.string().trim().min(1).max(80))
    .refine((v) => Object.keys(v).length <= 3),
  prices: z
    .array(z.object({ min_quantity: z.number().int().min(1).max(1000000), price }))
    .min(1)
    .max(21),
});
export const optionsInput = z.strictObject({
  expected_version: version,
  values: z.strictObject({ sourcing: sourcingSchema, skus: z.array(skuInput).min(1).max(100) }),
});
export const inventoryInput = z.strictObject({
  expected_version: version,
  quantity: z.number().int().min(0).max(1000000),
});
export const quoteResponseInput = z.strictObject({
  price,
  message: z.string().trim().min(5).max(3000),
});
const lines = z
  .array(
    z.strictObject({
      sku_id: uuid,
      quantity: z.number().int().min(1).max(1000000),
      unit_price: price,
    }),
  )
  .min(1)
  .max(100);
const offer = z
  .strictObject({
    notes: z.string().trim().max(3000),
    preparation_min: z.number().int().min(0).max(365),
    preparation_max: z.number().int().min(0).max(365),
    expires_at: expectedTimestamp,
    lines,
  })
  .refine((v) => v.preparation_max >= v.preparation_min, 'Invalid preparation range');
export const offerInput = z.strictObject({ expected_revision: version, values: offer });
export const bidInput = z.strictObject({
  expected_version: z.number().int().nonnegative(),
  values: offer.safeExtend({ product_id: uuid }),
});
export const supplierOrderActions = [
  'confirm',
  'cancel',
  'ship',
  'decline_cancel',
  'return_received',
  'note',
] as const;
export const orderActionInput = z
  .strictObject({
    expected_version: version,
    action: z.enum(supplierOrderActions),
    values: actionSchema,
  })
  .superRefine((v, ctx) => {
    try {
      validateOrderAction(v.action, v.values);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['values'],
        message: 'Provide all required fields for this action',
      });
    }
  });
export const messageInput = z
  .strictObject({
    body: z.string().trim().max(4000),
    nonce: uuid,
    product_id: uuid.optional(),
    image_id: uuid.optional(),
  })
  .refine((v) => !!v.body || !!v.image_id, 'Provide a message or image');
export const readInput = z.strictObject({ message_id: uuid });
export const stepInput = z.discriminatedUnion('step', [
  z.strictObject({ step: z.literal('identity'), expected_version: version, values: identityDraft }),
  z.strictObject({
    step: z.literal('trade_license'),
    expected_version: version,
    values: tradeDraft,
  }),
  z.strictObject({ step: z.literal('bank'), expected_version: version, values: bankDraft }),
]);
export const verificationSubmitInput = z.strictObject({
  expected_version: version,
  declaration: z.literal(true),
});
export const verificationRemoveInput = z.strictObject({ expected_version: version, file_id: uuid });
export const warningInput = z.strictObject({
  expected_version: version,
  response: z.string().trim().min(5).max(3000),
});
export const replyInput = z.strictObject({
  expected_version: z.number().int().nonnegative(),
  body: z.string().trim().min(5).max(3000),
});
export const importValidateInput = z.strictObject({ csv: z.string().min(1).max(2097152) });
export const importInput = z.strictObject({ products: z.array(productInput).min(1).max(100) });
export const notificationInput = z.strictObject({ is_read: z.boolean() });
export const uploadInput = z
  .strictObject({
    purpose: z.enum(['product', 'store', 'avatar', 'verification', 'chat']),
    parent_id: uuid,
    mime: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    size: z.number().int().positive().max(10485760),
    slot: z.enum(['identity_front', 'identity_back', 'trade_license', 'bank_proof']).optional(),
    width: z.number().int().positive().max(1600).optional(),
    height: z.number().int().positive().max(1600).optional(),
  })
  .superRefine((v, ctx) => {
    if (
      v.purpose === 'chat' &&
      (!v.width || !v.height || v.mime !== 'image/webp' || v.size > 1048576)
    )
      ctx.addIssue({ code: 'custom', message: 'Use a WebP chat image up to 1600px and 1 MB' });
    if (v.purpose === 'verification' && !v.slot)
      ctx.addIssue({ code: 'custom', message: 'Evidence slot required' });
    if (
      v.mime === 'application/pdf' &&
      (v.purpose !== 'verification' || v.slot !== 'trade_license')
    )
      ctx.addIssue({ code: 'custom', message: 'PDF is only allowed for trade licences' });
    if (v.purpose === 'store' && (v.mime !== 'image/webp' || v.size > 262144))
      ctx.addIssue({ code: 'custom', message: 'Store images must be WebP up to 256 KB' });
  });
export const uploadCompleteInput = z.strictObject({ expected_version: version.optional() });
export const listQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  search: z.string().max(200).default(''),
  state: z.string().max(60).default(''),
});
export const pageQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const inboxQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  unread_only: z.enum(['true', 'false']).default('false'),
});
export const conversationQuery = listQuery
  .omit({ state: true })
  .extend({ unread_only: z.enum(['true', 'false']).default('false') });
const cursor = z.string().transform((v, ctx) => {
  try {
    return z.strictObject({ created_at: expectedTimestamp, id: uuid }).parse(JSON.parse(v));
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid cursor JSON' });
    return z.NEVER;
  }
});
export const messagesQuery = z
  .strictObject({ before: cursor.optional(), after: cursor.optional() })
  .refine((v) => !(v.before && v.after), 'Choose one cursor direction');
export const tenderQuery = listQuery
  .omit({ state: true })
  .extend({ view: z.enum(['open', 'mine']).default('open'), category: uuid.optional() });
