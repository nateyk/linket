import fs from 'node:fs';
import path from 'node:path';
import {expect, type Page} from '@playwright/test';

export type HcTestAccount = {email: string; password: string};

export function loadIsolatedHcFixture<T extends {database: string}>(): T {
  const host = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:5173').hostname;
  expect(['127.0.0.1', 'localhost', 'linket.ddev.site']).toContain(host);
  const filename = path.resolve('storage/app/e2e/hc-fixture.json');
  expect(fs.existsSync(filename), 'Missing disposable Help Center fixtures').toBe(true);
  const data = JSON.parse(fs.readFileSync(filename, 'utf8')) as T;
  expect(data.database.toLowerCase()).toContain('test');
  return data;
}

export async function loginToHc(page: Page, account: HcTestAccount): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', {name: 'Email Address'}).fill(account.email);
  await page.getByRole('textbox', {name: 'Password'}).fill(account.password);
  await page.getByRole('button', {name: 'Login'}).click();
  await expect(page).not.toHaveURL(/\/login$/, {timeout: 45_000});
}
