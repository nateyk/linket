/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {AuthLayoutV2} from './auth-layout-v2';
import {STARFIELD_SCENE} from './auth-starfield';

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    branding: {site_name: 'Linket', logo_light: '/light.svg', logo_dark: '/dark.svg'},
  }),
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@common/locale-switcher/locale-switcher', () => ({
  LocaleSwitcher: () => <button type="button">Choose language</button>,
}));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderAuth(audience?: 'creator' | 'portal', topAction?: React.ReactNode) {
  return render(
    <AuthLayoutV2 audience={audience} topAction={topAction}>
      <form aria-label="Auth form">
        <input aria-label="Email" type="email" />
        <button type="submit">Continue</button>
      </form>
    </AuthLayoutV2>,
  );
}

test('auth keeps its form and locale without duplicate logos', () => {
  const {container} = renderAuth();
  expect(screen.getByRole('form', {name: 'Auth form'})).toBeTruthy();
  expect(screen.getByRole('heading', {name: 'A simpler way to sell what you create.'})).toBeTruthy();
  expect(screen.getByText('Your brand. Your storefront. Your business.')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Choose language'})).toBeTruthy();
  expect(container.querySelector('header')).toBeNull();
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('aside')?.className).toContain('bg-muted/35');
});

test('hero uses real WebGL starfield canvas with a nonblocking fallback, not SVG dots', () => {
  const {container} = renderAuth();
  const root = container.querySelector('[data-slot="starfield"]') as HTMLElement;
  expect(root).toBeTruthy();
  expect(root.className).toContain('pointer-events-none');
  expect(root.getAttribute('data-state')).toBe('unsupported');
  expect(root.querySelector('canvas[data-slot="background-canvas-canvas"]')).toBeTruthy();
  expect(root.querySelector('[data-slot="background-canvas-fallback"]')).toBeTruthy();
  expect(root.querySelector('svg')).toBeNull();
  expect(STARFIELD_SCENE).toContain('for (int l = 0; l < 5; l++)');
  expect(STARFIELD_SCENE).toContain('uPointer.xy');
  expect(STARFIELD_SCENE).toContain('uWarp');
  expect(STARFIELD_SCENE).toContain('halo + arms');
});

test('portal uses buyer-specific messaging with the same shader', () => {
  const {container} = renderAuth('portal');
  expect(screen.getByRole('heading', {name: 'Your purchases, all in one place.'})).toBeTruthy();
  expect(screen.getByText('Your purchases are protected by email verification.')).toBeTruthy();
  expect(screen.queryByText('A simpler way to sell what you create.')).toBeNull();
  expect(container.querySelector('[data-slot="starfield"] canvas')).toBeTruthy();
});

test('optional action is accessible and never inserts duplicate branding', () => {
  const {container} = renderAuth('creator', <a href="/help">Help</a>);
  expect(screen.getByRole('link', {name: 'Help'})).toBeTruthy();
  expect(container.querySelector('header')).toBeNull();
  expect(container.querySelector('img')).toBeNull();
});
