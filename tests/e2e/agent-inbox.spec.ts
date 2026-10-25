import {test, expect} from '@playwright/test';

/**
 * Smoke: agent inbox chrome loads for a seeded staff user.
 *
 * Env:
 * - E2E_BASE_URL (default http://localhost:5173)
 * - E2E_AGENT_EMAIL (default admin@admin.com — admin can open agent routes)
 * - E2E_AGENT_PASSWORD (default password)
 * - E2E_NO_SERVER=1 when Vite/DDEV already running
 */
test.describe.configure({retries: 0});

const agentEmail = process.env.E2E_AGENT_EMAIL ?? 'admin@admin.com';
const agentPassword = process.env.E2E_AGENT_PASSWORD ?? 'password';

test.describe('Agent inbox', () => {
  test('logged-in agent can open conversations inbox', async ({page}) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', agentEmail);
    await page.fill('input[name="password"]', agentPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(dashboard|admin|agent)/);

    await page.goto('/agent/conversations');
    await expect(page).not.toHaveURL(/\/login/);
    // Inbox shell: view list, conversation list, or empty state — not a hard 403 page
    await expect(
      page
        .getByRole('heading', {name: /conversation|inbox|ticket/i})
        .or(page.getByText(/no conversations|select a conversation|inbox/i))
        .first(),
    ).toBeVisible({timeout: 30000});
  });
});
