/**
 * @vitest-environment jsdom
 */
import {act, render, screen} from '@testing-library/react';
import {beforeEach, expect, test, vi} from 'vitest';

/**
 * The editor drives the phone preview over postMessage. Only three things
 * may move it: a message from the editor window, from this origin, with a
 * payload that validates — and only while the page runs with ?preview=1.
 * The public page must ignore the protocol entirely (A-06).
 */
vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    branding: {site_name: 'Linket', logo_dark: '/logo.svg', logo_light: ''},
    biolink: {branding_img: ''},
  }),
}));

vi.mock('@ui/themes/use-is-dark-mode', () => ({
  useIsDarkMode: () => false,
}));

const {usePreviewSync} = await import('./linkeable-renderer');

function Probe() {
  const {previewSection, isPreview} = usePreviewSync(undefined);
  return (
    <div>
      <span data-testid="section">{previewSection ?? 'none'}</span>
      <span data-testid="is-preview">{String(isPreview)}</span>
    </div>
  );
}

function post(data: unknown, origin = window.location.origin, source?: object) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin,
        source: (source ?? window.parent) as Window,
      }),
    );
  });
}

const section = () => screen.getByTestId('section').textContent;

function mountOn(pathname: string) {
  window.history.replaceState({}, '', pathname);
  render(<Probe />);
}

beforeEach(() => {
  window.history.replaceState({}, '', '/nate');
});

test('a valid tab message switches the section in preview mode', () => {
  mountOn('/nate?preview=1');
  expect(screen.getByTestId('is-preview').textContent).toBe('true');
  expect(section()).toBe('none');

  post({
    type: 'linket:store-preview-tab',
    activeTab: 'content',
    section: 'about',
  });

  expect(section()).toBe('about');
});

test('a message from another origin is ignored', () => {
  mountOn('/nate?preview=1');

  post(
    {type: 'linket:store-preview-tab', activeTab: 'content', section: 'about'},
    'https://evil.example',
  );

  expect(section()).toBe('none');
});

test('a malformed payload is ignored', () => {
  mountOn('/nate?preview=1');

  // Unknown section.
  post({
    type: 'linket:store-preview-tab',
    activeTab: 'content',
    section: 'checkout',
  });
  expect(section()).toBe('none');

  // Missing activeTab: not the agreed shape.
  post({type: 'linket:store-preview-tab', section: 'about'});
  expect(section()).toBe('none');

  // Missing section.
  post({type: 'linket:store-preview-tab', activeTab: 'about'});
  expect(section()).toBe('none');

  // Unknown editor tab.
  post({
    type: 'linket:store-preview-tab',
    activeTab: 'billing',
    section: 'about',
  });
  expect(section()).toBe('none');

  // Not a message object at all.
  post('linket:store-preview-tab');
  post(null);
  expect(section()).toBe('none');
});

test('without ?preview=1 the public page ignores the protocol', () => {
  mountOn('/nate');

  post({
    type: 'linket:store-preview-tab',
    activeTab: 'content',
    section: 'about',
  });

  expect(screen.getByTestId('is-preview').textContent).toBe('false');
  expect(section()).toBe('none');
});
