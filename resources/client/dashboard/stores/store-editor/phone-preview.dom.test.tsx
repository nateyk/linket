/**
 * @vitest-environment jsdom
 */
import {cleanup, render} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {PhonePreview} from './phone-preview';
import {
  PHONE_GEOMETRY,
  PHONE_STATUS_BAR_TIME_FONT_SIZE,
  scaleFor,
} from './phone-preview.constants';

/**
 * jsdom has no layout, so the screen's width is whatever the test says it is.
 * Driving the observer callback directly is what a real resize does, and it
 * keeps the assertions about the rendered output rather than about jsdom's
 * (absent) box model.
 */
let observers: Array<{callback: ResizeObserverCallback; targets: Element[]}> =
  [];
let screenWidth = 320;

function setScreenWidth(width: number) {
  screenWidth = width;
}

function fireResize() {
  for (const observer of observers) {
    const entries = observer.targets.map(target => ({
      target,
      contentRect: {width: screenWidth, height: 600} as DOMRectReadOnly,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    }));
    observer.callback(entries, {} as ResizeObserver);
  }
}

/**
 * Runs animation frames inline so a resize is observable without awaiting.
 * Restored automatically by the `restoreAllMocks` in the shared setup.
 */
function runFramesInline() {
  return vi
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation(cb => {
      cb(0);
      // The callback runs before the handle is assigned back to the hook, and it
      // clears that handle itself. Returning a non-zero id here would leave the
      // hook believing a frame is still pending and every later resize would be
      // dropped.
      return 0;
    });
}

beforeEach(() => {
  observers = [];
  screenWidth = 320;

  class FakeResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      observers.push({callback: this.callback, targets: [target]});
    }
    unobserve() {}
    disconnect() {
      observers = observers.filter(o => o.callback !== this.callback);
    }
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);

  // The screen's measured width.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return this.classList.contains('screen') ? screenWidth : 0;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function scaleOf(container: HTMLElement): string {
  const document_ = container.querySelector<HTMLElement>(
    '[data-phone-preview-document]',
  );
  return document_?.style.transform ?? '';
}

describe('PhonePreview', () => {
  test('renders the device artwork around a scaled page', () => {
    const {container} = render(
      <PhonePreview>
        <p>page</p>
      </PhonePreview>,
    );

    const images = [...container.querySelectorAll('img')];
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image.getAttribute('aria-hidden')).toBe('true');
      expect(image.getAttribute('draggable')).toBe('false');
      expect(image.getAttribute('decoding')).toBe('async');
      // Decoded off the main thread and cached as a file, not inlined.
      expect(image.getAttribute('width')).toBe('360');
      expect(image.getAttribute('height')).toBe('730');
      expect(image.getAttribute('src')).toMatch(/iphone-14-pro-(back|front)/);
    }
  });

  test('the page sits at the device viewport, unscaled by CSS', () => {
    const {container} = render(<PhonePreview>page</PhonePreview>);
    const document_ = container.querySelector<HTMLElement>(
      '[data-phone-preview-document]',
    )!;

    expect(document_.style.width).toBe(`${PHONE_GEOMETRY.viewport.width}px`);
    expect(document_.style.height).toBe(`${PHONE_GEOMETRY.viewport.height}px`);
    expect(document_.style.transformOrigin).toBe('top left');
    expect(document_.style.getPropertyValue('--safe-top')).toBe(
      `${PHONE_GEOMETRY.safeArea.top}px`,
    );
    expect(document_.style.getPropertyValue('--safe-bottom')).toBe(
      `${PHONE_GEOMETRY.safeArea.bottom}px`,
    );
  });

  test('the screen box matches the constants', () => {
    const {container} = render(<PhonePreview>page</PhonePreview>);
    const screen = container.querySelector<HTMLElement>('.screen')!;
    const {screen: box, radius} = PHONE_GEOMETRY;

    expect(screen.style.left).toBe(`${box.left}%`);
    expect(screen.style.top).toBe(`${box.top}%`);
    expect(screen.style.width).toBe(`${box.width}%`);
    expect(screen.style.height).toBe(`${box.height}%`);
    expect(screen.style.borderRadius).toBe(
      `${radius.horizontal}% / ${radius.vertical}%`,
    );
    // The single clipped box: corners come from here, not from the page.
    expect(screen.className).toContain('overflow-hidden');
  });

  test('the frame takes its ratio from the artwork', () => {
    const {container} = render(<PhonePreview>page</PhonePreview>);
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.style.aspectRatio).toBe(
      `${PHONE_GEOMETRY.viewBox.width} / ${PHONE_GEOMETRY.viewBox.height}`,
    );
  });

  test('device chrome is inert', () => {
    const {container} = render(<PhonePreview>page</PhonePreview>);

    const statusBar = container.querySelector<HTMLElement>(
      '[aria-hidden="true"].z-\\[2\\]',
    );
    expect(statusBar).toBeTruthy();
    expect(statusBar!.className).toContain('pointer-events-none');
    // The status bar reserves the safe area so it never sits on the island.
    expect(statusBar!.style.height).toBe(`${PHONE_GEOMETRY.safeArea.top}px`);
    // Its own glyphs stay hit-testable, like a real status bar: the strip
    // passes taps through to the preview, but the clock and indicators
    // swallow touches instead of letting them fall into the page beneath.
    const glyphs = statusBar!.querySelectorAll('span');
    expect(glyphs.length).toBeGreaterThan(0);
    for (const glyph of glyphs) {
      expect(glyph.className).toContain('pointer-events-auto');
    }

    const home = container.querySelector<HTMLElement>('.bg-black\\/70');
    expect(home).toBeTruthy();
    expect(home!.className).toContain('pointer-events-none');
    expect(home!.className).toContain('z-[2]');
  });

  test('the front plate never intercepts clicks meant for the page', () => {
    const {container} = render(<PhonePreview>page</PhonePreview>);
    const front = [...container.querySelectorAll('img')].find(img =>
      img.getAttribute('src')?.includes('front'),
    )!;
    // Above the screen in stacking order, yet transparent to the pointer.
    expect(front.className).toContain('z-[3]');
    expect(front.className).toContain('pointer-events-none');
  });

  test('status bar time keeps the device-chrome 15px exemption (font advisory)', () => {
    const {container} = render(<PhonePreview>page</PhonePreview>);

    const statusBar = container.querySelector<HTMLElement>(
      '[aria-hidden="true"].z-\\[2\\]',
    );
    expect(statusBar).toBeTruthy();
    // Sourced from the shared constant so the exemption is documented in
    // one place: real iPhone status-bar chrome, exempt from the type ramp.
    expect(statusBar!.style.fontSize).toBe(
      `${PHONE_STATUS_BAR_TIME_FONT_SIZE}px`,
    );
    expect(PHONE_STATUS_BAR_TIME_FONT_SIZE).toBe(15);
    // The size must come from the shared constant, not an arbitrary
    // utility class (keeps the DESIGN.md detector off this file).
    expect(statusBar!.className).not.toContain('text-[');
  });
});

describe('usePhoneScale', () => {
  test('applies the scale for the measured width', () => {
    runFramesInline();
    const {container} = render(<PhonePreview>page</PhonePreview>);
    setScreenWidth(320);
    fireResize();

    expect(scaleOf(container)).toBe(`scale(${scaleFor(320)})`);
  });

  test('coalesces a burst of resizes into one write per frame', () => {
    // Queue the callback instead of running it, so several resize events can
    // land before the frame runs.
    const queue: FrameRequestCallback[] = [];
    const raf = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation(cb => {
        queue.push(cb);
        return 7;
      });

    const {container} = render(<PhonePreview>page</PhonePreview>);
    const mountFrames = raf.mock.calls.length;

    setScreenWidth(200);
    fireResize();
    setScreenWidth(240);
    fireResize();
    setScreenWidth(280);
    fireResize();

    // One frame requested for the whole burst, not one per event.
    expect(raf.mock.calls.length).toBe(mountFrames + 1);

    queue.forEach(cb => cb(0));
    expect(scaleOf(container)).toBe(`scale(${scaleFor(280)})`);
  });

  test('ignores sub-pixel churn', () => {
    runFramesInline();
    const {container} = render(<PhonePreview>page</PhonePreview>);
    setScreenWidth(320);
    fireResize();
    const before = scaleOf(container);

    // 0.2px is flex/grid rounding, not a resize.
    setScreenWidth(320.2);
    fireResize();

    expect(scaleOf(container)).toBe(before);
  });

  test('the page inside does not re-render when only the scale changes', () => {
    runFramesInline();
    let renders = 0;
    function Page() {
      renders += 1;
      return <p>page</p>;
    }

    const {container} = render(
      <PhonePreview>
        <Page />
      </PhonePreview>,
    );
    const afterMount = renders;

    setScreenWidth(300);
    fireResize();
    setScreenWidth(360);
    fireResize();

    // The whole point of writing the scale to the DOM instead of state.
    expect(renders).toBe(afterMount);
    expect(scaleOf(container)).toBe(`scale(${scaleFor(360)})`);
  });

  test('stops observing and cancels a pending frame on unmount', () => {
    const cancel = vi
      .spyOn(globalThis, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    // Hold a frame open so there is something to cancel.
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 42);

    const {unmount} = render(<PhonePreview>page</PhonePreview>);
    expect(observers.length).toBeGreaterThan(0);

    // A resize arrives and leaves its frame pending.
    setScreenWidth(300);
    fireResize();
    expect(cancel).not.toHaveBeenCalled();

    unmount();

    expect(cancel).toHaveBeenCalledWith(42);
    expect(observers).toHaveLength(0);
  });
});
