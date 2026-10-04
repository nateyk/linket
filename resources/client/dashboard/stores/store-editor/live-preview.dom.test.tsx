/**
 * @vitest-environment jsdom
 */
import {render} from '@testing-library/react';
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
vi.mock('@app/dashboard/stores/store-editor/biolink-editor-store', () => ({
  useBiolinkEditorStore: (selector: (s: unknown) => unknown) =>
    selector({
      biolink: {back_half: 'demo'},
      appearance: null,
      content: [],
      profileConfig: null,
    }),
}));

vi.mock('react-router', () => ({
  useLocation: () => ({pathname: '/dashboard/stores/demo/content'}),
}));

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <span>{message}</span>,
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