/**
 * @vitest-environment jsdom
 *
 * Hardening: the `/` route's loader read
 * `getBootstrapData().settings.homepage.type` unguarded. On an env whose
 * `settings` table lacks a `homepage` row (fresh/unseeded install),
 * `settings.homepage` is undefined → TypeError → the whole SPA entry crashes
 * to the error boundary for logged-out visitors. This pins graceful
 * degradation (missing `homepage` behaves like "not a loginPage") and keeps
 * the real `loginPage` → `/login` redirect intact.
 *
 * Approach notes:
 * - `appRouter` (a createBrowserRouter instance) only exposes loaders through
 *   its route objects, so the `/` child route's `loader` is located via
 *   `appRouter.routes` and invoked directly (same precedent as
 *   dashboard-routes.test.tsx invoking route loaders).
 * - Importing `@app/app-router` runs `createBrowserRouter` at module load,
 *   which reads `getBootstrapData().settings.html_base_uri` — so bootstrap
 *   data is seeded via `setBootstrapData` BEFORE a top-level-await dynamic
 *   `import('@app/app-router')` (keeps the module-graph cost out of the
 *   per-test timeout).
 * - `queryClient.ensureQueryData` (the loader's tail) is mocked to resolve
 *   null so no real fetch happens.
 * - `getSettingsPreviewMode()` only inspects `location.ancestorOrigins` /
 *   `window.frameElement`; under jsdom `ancestorOrigins` is undefined →
 *   `isInsideSettingsPreview: false` with no bootstrap data needs.
 */
import {
  setBootstrapData,
  type BootstrapDataState,
} from '@ui/bootstrap-data/bootstrap-data-store';
import {describe, expect, test, vi} from 'vitest';

vi.mock('@common/http/query-client', async () => {
  const actual =
    await vi.importActual<typeof import('@common/http/query-client')>(
      '@common/http/query-client',
    );
  // Keep the real queryClient (methods may be touched at import time by the
  // router's module graph), but make ensureQueryData resolve null so the
  // loader's tail does no real work.
  return {
    ...actual,
    queryClient: new Proxy(actual.queryClient, {
      get(target, prop, receiver) {
        if (prop === 'ensureQueryData') return () => Promise.resolve(null);
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }),
  };
});

function setFixture(data: Record<string, unknown>) {
  (setBootstrapData as unknown as BootstrapDataState['setData'])(data as never);
}

// Seed settings.html_base_uri before the module loads: createBrowserRouter
// runs at module-eval time and reads getBootstrapData().settings.html_base_uri.
// The import itself is hoisted to top-level await so its (large) module-graph
// cost doesn't eat into the per-test timeout.
setFixture({settings: {html_base_uri: ''}});
const {appRouter} = await import('@app/app-router');

function homeRouteLoader() {
  const rootRoute = appRouter.routes.find(r => r.id === 'root') as any;
  const homeRoute = rootRoute.children.find((r: any) => r.path === '/');
  expect(homeRoute, '"/" route must exist in appRouter').toBeTruthy();
  return homeRoute.loader as () => Promise<unknown>;
}

describe('root loader tolerates missing settings.homepage', () => {
  test('logged out, settings without homepage key: does not throw', async () => {
    // Fresh/unseeded env: NO `homepage` key under settings at all.
    setFixture({user: null, loaders: undefined, settings: {}});
    const loader = homeRouteLoader();

    const result = await loader();

    // Pre-fix this threw: TypeError: Cannot read properties of undefined
    // (reading 'type'). Post-fix the guard degrades to "not a loginPage"
    // and the loader continues to its (mocked) data tail.
    expect(result).toBeNull();
  });

  test('loginPage homepage + logged out: still redirects to /login', async () => {
    setFixture({
      user: null,
      loaders: undefined,
      settings: {homepage: {type: 'loginPage'}},
    });
    const loader = homeRouteLoader();

    const response = (await loader()) as Response;

    expect(response).toBeTruthy();
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
  });
});
