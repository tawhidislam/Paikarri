import type { Page } from '@playwright/test';
import { chatFixture } from './chat-fixture';
import { policyConfig, type PolicyKind } from '../../src/lib/policy-config';
import type { TermsContent } from '../../src/lib/terms-schema';

// Every mutation is intercepted in this browser; cloud policy data stays untouched.
export async function policyFixture(
  page: Page,
  {
    role = 'super_admin',
    fail = false,
    conflict = false,
    published = false,
    kind = 'terms' as PolicyKind,
  } = {},
) {
  await chatFixture(page, { role });
  const calls: string[] = [];
  for (const current of ['terms', 'refund'] as const) {
    let draft: TermsContent = {
      ...policyConfig(current).defaultContent,
      effective_date: '2026-10-18',
    };
    let live = published && current === kind ? draft : null;
    let revision = 1,
      publishedRevision = live ? 1 : null;
    const history: {
      revision: number;
      action: string;
      after_content: TermsContent;
      created_at: string;
    }[] = [];
    const names = {
      state: `admin_${current}_state`,
      save: `admin_save_${current}`,
      publish: `admin_publish_${current}`,
      public: `get_${current}_content`,
    };
    for (const name of Object.values(names))
      await page.route(`**/rest/v1/rpc/${name}`, async (route) => {
        calls.push(name);
        const body = route.request().postDataJSON();
        if (name.startsWith('admin_') && role !== 'super_admin')
          return route.fulfill({
            status: 403,
            json: { message: 'Super admin required', code: '42501' },
          });
        if (fail && current === kind && name === names.public)
          return route.fulfill({
            status: 503,
            json: {
              message: current === 'terms' ? 'Terms unavailable' : 'Refund policy unavailable',
            },
          });
        if (name === names.state)
          return route.fulfill({
            json: {
              draft,
              published: live,
              revision,
              published_revision: publishedRevision,
              published_at: live ? '2026-10-18T04:00:00Z' : null,
              history,
            },
          });
        if (name === names.public)
          return route.fulfill({
            json: live
              ? { content: live, version: publishedRevision, published_at: '2026-10-18T04:00:00Z' }
              : null,
          });
        if ((conflict && current === kind) || body.expected_revision !== revision)
          return route.fulfill({
            status: 409,
            json: {
              message:
                current === 'terms'
                  ? 'Terms changed in another tab. Reload before saving.'
                  : 'Refund policy changed in another tab. Reload before saving.',
              code: '40001',
            },
          });
        if (name === names.save) draft = body.config;
        else {
          live = draft;
          publishedRevision = revision + 1;
        }
        revision++;
        history.unshift({
          revision,
          action: name === names.save ? 'saved' : 'published',
          after_content: draft,
          created_at: '2026-10-18T04:00:00Z',
        });
        return route.fulfill({ json: name === names.save ? revision : null });
      });
  }
  return calls;
}
