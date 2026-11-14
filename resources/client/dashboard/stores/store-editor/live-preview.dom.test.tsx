/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {
  PHONE_FRAME_ASPECT_RATIO,
  PHONE_GEOMETRY,
} from './phone-preview.constants';

/**
 * LivePreview reaches for the store, the router and the Trans provider, none
 * of which exist here. Stubbing the panel's own output is enough to assert the
 * fit rules, which are the part worth protecting.
 */
const {location, store} = vi.hoisted(() => ({
  location: {pathname: '/dashboard/stores/demo'},
  store: {
    biolink: {back_half: 'demo'},
    appearance: null,
    content: [],
    profileConfig: null,
    openSection: 'profile',
  } as Record<string, unknown>,
}));

vi.mock('@app/dashboard/stores/store-editor/biolink-editor-store', () => ({
  useBiolinkEditorStore: (selector: (s: unknown) => unknown) =>
    selector(store),
}));

vi.mock('react-router', () => ({
  useLocation: () => location,
}));

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <span>{message}</span>,
}));

vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({
    trans: ({message}: {message: string}) => message,
  }),
}));

const {LivePreview} = await import('./live-preview');

/** The panel is the outermost div LivePreview renders. */
function panelOf(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

/** The element that measures the panel and sizes the frame. */
function fitBoxOf(panel: HTMLElement): HTMLElement {
  return panel.querySelector<HTMLElement>('[class*="container-type"]')!;
}

function frameOf(fitBox: HTMLElement): HTMLElement {
  return fitBox.firstElementChild as HTMLElement;
}

beforeEach(() => {
  // jsdom computes no layout; the frame's width is the value under test.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 320;
    },
  });
});

describe('LivePreview fit', () => {
  test('the panel is a size container so the frame can measure its height', () => {
    const {container} = render(<LivePreview />);
    expect(fitBoxOf(panelOf(container)).className).toContain(
      '[container-type:size]',
    );
  });

  test('the frame is sized to whichever of width or height runs out first', () => {
    const {container} = render(<LivePreview />);
    const frame = frameOf(fitBoxOf(panelOf(container)));

    // min() against the panel width, or the width that fits the height on
    // offer -- never a fixed width that could overflow either. jsdom's CSSOM
    // folds the calc away, so assert on the resolved container-unit width.
    expect(frame.style.width).toContain('100cqw');
    const heightBound = frame.style.width.match(/([\d.]+)cqh/);
    expect(heightBound).toBeTruthy();
    // 100cqh times the artwork ratio, to within the precision jsdom kept.
    expect(Number(heightBound![1])).toBeCloseTo(
      100 * PHONE_FRAME_ASPECT_RATIO,
      2,
    );
  });

  test('the frame keeps the artwork ratio', () => {
    const {container} = render(<LivePreview />);
    const frame = frameOf(fitBoxOf(panelOf(container)));
    const {width, height} = PHONE_GEOMETRY.viewBox;
    expect(frame.style.aspectRatio).toBe(`${width} / ${height}`);
  });

  test('the panel cannot scroll or crop the device', () => {
    const {container} = render(<LivePreview />);
    const className = panelOf(container).className;
    // overflow-hidden is what keeps a too-tall phone from spilling out of the
    // column; the fit rules above are what stop it being too tall in the
    // first place.
    expect(className).toContain('overflow-hidden');
    // It fills the row on large screens so the fit box has a real height.
    expect(className).toContain('lg:h-full');
  });

  test('the iframe carries the device viewport and a descriptive title', () => {
    const {container} = render(<LivePreview />);
    const iframe = container.querySelector('iframe')!;

    expect(iframe.getAttribute('width')).toBe(
      `${PHONE_GEOMETRY.viewport.width}`,
    );
    expect(iframe.getAttribute('height')).toBe(
      `${PHONE_GEOMETRY.viewport.height}`,
    );
    // A title that says what the frame shows, not just "preview".
    expect(iframe.getAttribute('title')).toBe(
      'Live preview of the store page on an iPhone 14 Pro',
    );
    // Scrolling inside the frame must keep working.
    expect(iframe.getAttribute('scrolling')).toBe('auto');
    expect(iframe.getAttribute('src')).toBe('/demo?preview=1');
  });

  test('draft edits are posted, debounced, and never reload the frame', () => {
    vi.useFakeTimers();
    const postMessage = vi.fn();
    vi.stubGlobal('postMessage', postMessage);

    const {container, rerender} = render(<LivePreview />);
    const iframe = container.querySelector('iframe')!;
    // The frame is a real public route; edits arrive over postMessage so the
    // document is never reloaded (which would flicker and lose scroll).
    const send = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: {postMessage: send},
    });

    rerender(<LivePreview />);
    rerender(<LivePreview />);

    // Nothing sent yet: the burst is still settling.
    expect(send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);

    expect(send).toHaveBeenCalled();
    expect(send.mock.calls.length).toBe(1);
    const [message, origin] = send.mock.calls[0];
    expect(message.type).toBe('linket:store-preview');
    expect(message.payload.biolink.back_half).toBe('demo');
    expect(origin).toBe(window.location.origin);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('an edit never reloads the frame', () => {
    vi.useFakeTimers();
    const {container, rerender} = render(<LivePreview />);
    const iframe = container.querySelector('iframe')!;
    // src is the only thing that would trigger a load, and the element is
    // keyed on the slug so a draft change cannot remount it.
    const src = iframe.getAttribute('src');
    const element = iframe;

    rerender(<LivePreview />);
    rerender(<LivePreview />);
    vi.advanceTimersByTime(500);
    rerender(<LivePreview />);

    const after = container.querySelector('iframe')!;
    expect(after).toBe(element);
    expect(after.getAttribute('src')).toBe(src);
    vi.useRealTimers();
  });

  test('a pending sync is cancelled on unmount', () => {
    vi.useFakeTimers();
    const {unmount} = render(<LivePreview />);
    unmount();
    // No "update on an unmounted component" and no late postMessage.
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    vi.useRealTimers();
  });
});

describe('LivePreview follows the editor tab (A-06)', () => {
  beforeEach(() => {
    location.pathname = '/dashboard/stores/demo';
    store.openSection = 'profile';
  });

  /** Renders the panel and wires the frame's contentWindow to a spy. */
  function renderFrame() {
    const {rerender, container} = render(<LivePreview />);
    const iframe = container.querySelector('iframe')!;
    const send = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: {postMessage: send},
    });
    return {send, rerender};
  }

  function ready() {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {type: 'linket:store-preview-ready'},
      }),
    );
  }

  /** Most recent message posted to the frame (undefined if none). */
  function lastSent(send: {mock: {calls: unknown[][]}}) {
    return send.mock.calls.at(-1)?.[0];
  }

  test('the ready handshake posts the draft and the current section', () => {
    const {send} = renderFrame();
    ready();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].type).toBe('linket:store-preview');
    expect(lastSent(send)).toEqual({
      type: 'linket:store-preview-tab',
      activeTab: 'content',
      section: 'profile',
    });
    expect(send.mock.calls[1][1]).toBe(window.location.origin);
  });

  test('tab changes post the mapped section; insights holds the last one', () => {
    const {send, rerender} = renderFrame();
    ready();
    expect(send).toHaveBeenCalledTimes(2);

    // Content -> About: the preview must land on its About section.
    location.pathname = '/dashboard/stores/demo/about';
    rerender(<LivePreview />);
    expect(lastSent(send)).toEqual({
      type: 'linket:store-preview-tab',
      activeTab: 'about',
      section: 'about',
    });

    // Insights: no mapping, no message — the frame keeps its section.
    const count = send.mock.calls.length;
    location.pathname = '/dashboard/stores/demo/insights';
    rerender(<LivePreview />);
    expect(send).toHaveBeenCalledTimes(count);

    // Appearance maps to the Profile section.
    location.pathname = '/dashboard/stores/demo/appearance';
    rerender(<LivePreview />);
    expect(lastSent(send)).toEqual({
      type: 'linket:store-preview-tab',
      activeTab: 'appearance',
      section: 'profile',
    });
  });

  test('the Products accordion maps Content to the Products section', () => {
    store.openSection = 'products';
    const {send, rerender} = renderFrame();
    ready();
    expect(lastSent(send)).toEqual({
      type: 'linket:store-preview-tab',
      activeTab: 'content',
      section: 'products',
    });

    // Closing it back to Profile moves the preview too.
    store.openSection = 'profile';
    rerender(<LivePreview />);
    expect(lastSent(send)).toEqual({
      type: 'linket:store-preview-tab',
      activeTab: 'content',
      section: 'profile',
    });

    // On the About tab the accordion state is irrelevant: About = About.
    store.openSection = 'products';
    location.pathname = '/dashboard/stores/demo/about';
    rerender(<LivePreview />);
    expect(lastSent(send)).toEqual({
      type: 'linket:store-preview-tab',
      activeTab: 'about',
      section: 'about',
    });
  });
});

describe('desktop storefront preview', () => {
  beforeEach(() => {
    location.pathname = '/dashboard/stores/demo';
    store.openSection = 'profile';
    store.profileConfig = null;
  });

  test('shows one larger embedded phone without extra expansion chrome', () => {
    const {container} = render(<LivePreview />);
    const panel = panelOf(container);
    expect(panel.className).toContain('lg:h-full');
    expect(panel.className).toContain('lg:px-3');
    expect(panel.className).toContain('lg:py-4');
    expect(panel.querySelectorAll('iframe')).toHaveLength(1);
    expect(panel.querySelector('[class*="container-type"]')).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Expand preview'})).toBeNull();
    expect(screen.queryByText('Expanded live preview')).toBeNull();
    // Preserve a screen-reader heading without a space-consuming badge.
    const label = panel.querySelector('h2');
    expect(label?.className).toContain('sr-only');
    expect(label?.textContent).toBe('Live preview');
  });
});

describe('preview bottom drawer below lg (A-19)', () => {
  beforeEach(() => {
    location.pathname = '/dashboard/stores/demo';
    store.openSection = 'profile';
    store.profileConfig = null;
  });

  test('the stacked panel hides below lg and a footer Preview action takes over', () => {
    const {container} = render(<LivePreview />);

    // The panel stays mounted (so its frame keeps its state) but is hidden
    // below lg. The trigger belongs to a reserved footer row instead of
    // floating over editor content or the app navigation.
    expect(panelOf(container).className).toContain('max-lg:hidden');
    const trigger = screen.getByRole('button', {name: 'Preview'});
    const footer = trigger.parentElement as HTMLElement;
    expect(footer.className).toContain('sticky');
    expect(footer.className).toContain('bottom-0');
    expect(footer.className).toContain('border-t');
    expect(footer.className).toContain('lg:hidden');
    expect(trigger.className).toContain('w-full');
    expect(trigger.className).not.toContain('fixed');
  });

  test('the mobile preview uses the shared bottom drawer and a spacious phone area', async () => {
    render(<LivePreview />);
    fireEvent.click(screen.getByRole('button', {name: 'Preview'}));
    const popup = document.querySelector<HTMLElement>('[data-slot="drawer-popup"]');
    await waitFor(() => expect(popup).toBeTruthy());
    expect(popup?.getAttribute('data-position')).toBe('bottom');
    expect(popup?.className).toContain('94dvh');
    expect(popup?.className).toContain('max-h-none');
    expect(document.querySelector('[data-slot="drawer-overlay"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="drawer-content"] iframe')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Close preview'})).toBeTruthy();
  });

  test('the drawer is a titled modal that lazily mounts its own frame', async () => {
    render(<LivePreview />);

    // One frame — the panel's — until the drawer has actually been opened.
    expect(document.querySelectorAll('iframe').length).toBe(1);

    fireEvent.click(screen.getByRole('button', {name: 'Preview'}));

    const dialog = await screen.findByRole('dialog', {name: 'Live preview'});
    // Base UI Drawer supplies modal focus/scroll behavior at Drawer.Root;
    // it does not forward an aria-modal attribute from Drawer.Content.
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(document.querySelector('[data-slot="drawer-overlay"]')).toBeTruthy();
    await waitFor(() =>
      expect(document.querySelectorAll('iframe').length).toBe(2),
    );
  });

  test('Esc closes the drawer and returns focus to the Preview button', async () => {
    render(<LivePreview />);
    const trigger = screen.getByRole('button', {name: 'Preview'});
    // A pointer click focuses the button in a real browser; jsdom does not.
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );

    fireEvent.keyDown(document.activeElement as Element, {key: 'Escape'});

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  test('after close the popup stays mounted but hidden, frame included', async () => {
    render(<LivePreview />);
    fireEvent.click(screen.getByRole('button', {name: 'Preview'}));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    fireEvent.keyDown(document.activeElement as Element, {key: 'Escape'});
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const drawerContent = document.querySelector<HTMLElement>(
      '[data-slot="drawer-content"]',
    );
    expect(drawerContent).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    // The lazily mounted frame is kept, not torn down and rebuilt on reopen.
    expect(document.querySelectorAll('iframe').length).toBe(2);
  });

  test('the drawer frame receives debounced edits and the A-06 tab message', async () => {
    const {rerender} = render(<LivePreview />);
    fireEvent.click(screen.getByRole('button', {name: 'Preview'}));
    await screen.findByRole('dialog');

    const drawerFrame = document.querySelector<HTMLElement>(
      '[data-slot="drawer-content"] iframe',
    )!;
    const send = vi.fn();
    Object.defineProperty(drawerFrame, 'contentWindow', {
      configurable: true,
      value: {postMessage: send},
    });
    const messages = () => send.mock.calls.map(([message]) => message as {type: string});

    // An edit streams into the drawer's frame after the debounce, carrying the
    // edited snapshot (the mount snapshot carried the old one).
    store.profileConfig = {bio: 'typed'};
    rerender(<LivePreview />);
    await waitFor(() => {
      const snapshot = messages().find(m => m.type === 'linket:store-preview');
      expect(snapshot).toBeTruthy();
      expect((snapshot as any).payload.profileConfig.bio).toBe('typed');
    });

    // Switching editor tabs re-posts the section to the drawer's frame too.
    location.pathname = '/dashboard/stores/demo/about';
    rerender(<LivePreview />);
    await waitFor(() =>
      expect(messages().at(-1)).toEqual({
        type: 'linket:store-preview-tab',
        activeTab: 'about',
        section: 'about',
      }),
    );
  });

  test('the drawer cannot outlive a switch to the insights tab', async () => {
    const {rerender} = render(<LivePreview />);
    fireEvent.click(screen.getByRole('button', {name: 'Preview'}));
    await screen.findByRole('dialog');

    location.pathname = '/dashboard/stores/demo/insights';
    rerender(<LivePreview />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', {name: 'Preview'})).toBeNull();

    // Coming back must not resurrect the drawer: its trigger was unmounted,
    // so a reopened modal would have nowhere to return focus.
    location.pathname = '/dashboard/stores/demo';
    rerender(<LivePreview />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

test('mobile preview is a secondary action with dialog semantics', () => {
  location.pathname = '/dashboard/stores/demo';
  const {unmount} = render(<LivePreview />);
  const button = screen.getByRole('button', {name: 'Preview'});
  expect(button.getAttribute('aria-haspopup')).toBe('dialog');
  expect(button.getAttribute('aria-expanded')).toBe('false');
  expect(button.className).toContain('bg-background');
  unmount();
});
