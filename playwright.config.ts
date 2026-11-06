import {defineConfig, devices} from '@playwright/test';

/**
 * E2E notes (see also AGENTS.md → Testing):
 * - Base URL: E2E_BASE_URL (default http://localhost:5173) or DDEV https://linket.ddev.site with E2E_NO_SERVER=1.
 * - Chromium on Linux/WSL may need libasound (libasound.so.2). Install the distro package or set LD_LIBRARY_PATH
 *   to a directory that provides it for your environment — never commit machine-specific library paths.
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // Vite binds IPv4; localhost can resolve to ::1 on hosted Linux runners.
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    extraHTTPHeaders: process.env.E2E_HOST_HEADER
      ? {Host: process.env.E2E_HOST_HEADER}
      : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
        // This is a Laravel Vite project, not a root-index.html SPA. Checking
        // "/" returns 404 even when Vite is healthy; probe an actual HTML
        // fixture and use the same IPv4 host as the dev server instead.
        url: 'http://127.0.0.1:5173/tests/e2e/fixtures/storefront-detail-qa.html',
        stdout: 'pipe',
        stderr: 'pipe',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  timeout: 60000,
});