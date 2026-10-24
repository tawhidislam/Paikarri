import { z } from 'zod';
import * as out from './outputs.ts';
import { requestDetail, requestSummary } from './sourcing-schema.ts';
import { tenderDetail, tenderSummary } from './tender-schema.ts';
import { notificationSchema } from './notification-schema.ts';
import { warningSchema } from './warning-schema.ts';
import * as input from './inputs.ts';
import { optionsSchema } from './buying-schema.ts';
import { detailSchema, stateSchema } from './verification-schema.ts';
import { orderDetailSchema, orderListSchema } from './order-schema.ts';
import { chatThreadSchema, chatMessageSchema, chatPageSchema } from './chat-schema.ts';
const json = z.json();
const product = out.product;
const business = out.business;
const paged = <T extends z.ZodType>(row: T) =>
  z.object({ total: z.number().int().nonnegative(), rows: z.array(row) }).catchall(json);
const order = orderDetailSchema.extend({
  allowed_actions: z.array(z.enum(input.supplierOrderActions)),
});
const orderList = orderListSchema.extend({
  rows: z.array(
    orderListSchema.shape.rows.element.extend({
      allowed_actions: z.array(z.enum(input.supplierOrderActions)),
    }),
  ),
});
function read<
  const P extends string,
  Q extends z.ZodType = z.ZodObject<Record<string, never>>,
  O extends z.ZodType = typeof json,
>(
  path: P,
  query: Q = input.empty as unknown as Q,
  output: O = json as unknown as O,
  paginated = false,
) {
  return {
    method: 'GET' as const,
    path,
    query,
    body: input.empty,
    output,
    paginated,
    idempotent: false,
  };
}
function write<const P extends string, B extends z.ZodType, O extends z.ZodType = typeof json>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: P,
  body: B,
  command: string,
  output: O = json as unknown as O,
) {
  return {
    method,
    path,
    query: input.empty,
    body,
    command,
    output,
    paginated: false,
    idempotent: true,
  };
}
/** Single source for dispatch, OpenAPI and the generated framework-independent client. */
export const routes = {
  me: read('/me', input.empty, out.me),
  onboarding: write(
    'POST',
    '/onboarding',
    input.empty,
    'onboarding',
    z.object({ role: z.literal('supplier') }),
  ),
  overview: read('/overview', input.empty, out.overview),
  performance: read('/performance', input.empty, out.performance),
  reference: read('/reference', input.empty, out.reference),
  business: read('/business', input.empty, business.nullable()),
  createBusiness: write('POST', '/business', input.businessInput, 'business_create', business),
  updateBusiness: write('PATCH', '/business', input.businessUpdate, 'business_update', business),
  shipping: read('/business/shipping', input.empty, out.shipping),
  updateShipping: write('PUT', '/business/shipping', input.shippingInput, 'shipping', out.shipping),
  profile: read('/profile', input.empty, out.profile),
  updateProfile: write('PATCH', '/profile', input.profileInput, 'profile_update', out.profile),
  products: read('/products', input.listQuery, paged(product), true),
  createProduct: write('POST', '/products', input.productInput, 'product_create', product),
  // Literal routes precede /products/{id}.
  importTemplate: read('/products/imports/template', input.empty, out.csv),
  importCategories: read('/products/imports/categories', input.empty, out.csv),
  exportProducts: read('/products/imports/export', input.empty, out.csv),
  validateImport: write(
    'POST',
    '/products/imports/validate',
    input.importValidateInput,
    'validate_import',
    out.importPreview,
  ),
  commitImport: write('POST', '/products/imports', input.importInput, 'import', z.array(z.uuid())),
  product: read('/products/{id}', input.empty, product),
  updateProduct: write('PATCH', '/products/{id}', input.productUpdate, 'product_update', product),
  deleteProduct: write(
    'DELETE',
    '/products/{id}',
    input.timestampInput,
    'product_delete',
    z.object({ deleted: z.literal(true) }),
  ),
  archiveProduct: write(
    'POST',
    '/products/{id}/archive',
    input.timestampInput,
    'product_archive',
    product,
  ),
  options: read('/products/{id}/options', input.empty, optionsSchema),
  updateOptions: write(
    'PUT',
    '/products/{id}/options',
    input.optionsInput,
    'options',
    optionsSchema,
  ),
  inventory: write(
    'PUT',
    '/products/{id}/skus/{sku_id}/inventory',
    input.inventoryInput,
    'inventory',
    optionsSchema,
  ),
  quotations: read('/quotations', input.listQuery, paged(out.quotation), true),
  quotation: read('/quotations/{id}', input.empty, out.quotation),
  respondQuotation: write(
    'POST',
    '/quotations/{id}/response',
    input.quoteResponseInput,
    'quotation_response',
    out.quoteResponse,
  ),
  requests: read('/requests', input.pageQuery, paged(requestSummary), true),
  request: read(
    '/requests/{id}',
    input.empty,
    requestDetail.extend({ buyer_organization: out.buyerOrganization }),
  ),
  publishOffer: write('POST', '/requests/{id}/offers', input.offerInput, 'offer', z.uuid()),
  orders: read('/orders', input.listQuery, orderList, true),
  order: read('/orders/{id}', input.empty, order),
  orderAction: write('POST', '/orders/{id}/actions', input.orderActionInput, 'order_action', order),
  conversations: read('/conversations', input.conversationQuery, paged(chatThreadSchema), true),
  conversation: read('/conversations/{id}', input.empty, chatThreadSchema),
  messages: read('/conversations/{id}/messages', input.messagesQuery, chatPageSchema),
  sendMessage: write(
    'POST',
    '/conversations/{id}/messages',
    input.messageInput,
    'message',
    chatMessageSchema,
  ),
  readConversation: write(
    'PUT',
    '/conversations/{id}/read',
    input.readInput,
    'read',
    z.object({ read: z.literal(true) }),
  ),
  verification: read('/verification', input.empty, stateSchema),
  startVerification: write(
    'POST',
    '/verification/applications',
    input.empty,
    'verification_start',
    detailSchema,
  ),
  verificationApplication: read('/verification/applications/{id}', input.empty, detailSchema),
  saveVerification: write(
    'PUT',
    '/verification/applications/{id}/steps',
    input.stepInput,
    'verification_step',
    detailSchema,
  ),
  submitVerification: write(
    'POST',
    '/verification/applications/{id}/submit',
    input.verificationSubmitInput,
    'verification_submit',
    detailSchema,
  ),
  removeVerificationFile: write(
    'DELETE',
    '/verification/applications/{id}/files',
    input.verificationRemoveInput,
    'verification_remove',
    detailSchema,
  ),
  actions: read('/actions', input.pageQuery, paged(warningSchema), true),
  respondAction: write(
    'POST',
    '/actions/{id}/response',
    input.warningInput,
    'warning_response',
    out.submitted,
  ),
  reviews: read('/reviews', input.pageQuery, paged(out.review), true),
  replyReview: write('PUT', '/reviews/{id}/reply', input.replyInput, 'review_reply', out.submitted),
  tenders: read('/tenders', input.tenderQuery, paged(tenderSummary), true),
  tender: read('/tenders/{id}', input.empty, tenderDetail),
  saveBid: write('PUT', '/tenders/{id}/bid', input.bidInput, 'tender_bid', z.uuid()),
  notifications: read('/notifications', input.inboxQuery, paged(notificationSchema), true),
  unreadNotifications: read('/notifications/unread', input.empty, z.number().int().nonnegative()),
  markAllNotifications: write(
    'POST',
    '/notifications/read-all',
    input.empty,
    'notifications_read',
    out.updated,
  ),
  markNotification: write(
    'PUT',
    '/notifications/{id}',
    input.notificationInput,
    'notification_read',
    out.updated,
  ),
  prepareUpload: write('POST', '/uploads', input.uploadInput, 'upload_prepare', out.preparedUpload),
  upload: read('/uploads/{id}', input.empty, out.uploadTicket),
  completeUpload: write(
    'POST',
    '/uploads/{id}/complete',
    input.uploadCompleteInput,
    'upload_complete',
    out.uploadComplete,
  ),
  removeUpload: write(
    'DELETE',
    '/uploads/{id}',
    input.uploadCompleteInput,
    'upload_remove',
    out.removed,
  ),
  readAsset: read('/uploads/{purpose}/{id}', input.empty, out.signedAsset),
  removeAsset: write(
    'DELETE',
    '/uploads/{purpose}/{id}',
    z.strictObject({ expected_path: z.string().max(500).optional() }),
    'asset_remove',
    out.removed,
  ),
} as const;
export type Operation = keyof typeof routes;
export type Route = (typeof routes)[Operation];
