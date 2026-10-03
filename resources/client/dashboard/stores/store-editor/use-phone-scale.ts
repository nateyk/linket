import {RefObject, useLayoutEffect} from 'react';
import {scaleFor} from './phone-preview.constants';

/**
 * Keeps the page inside the phone at a 1:1 CSS-pixel viewport, whatever width
 * the frame ends up at.
 *
 * The scale is written straight to the DOM through `ref` rather than held in
 * state on purpose: a resize must not re-render the page inside the frame,
 * which would rebuild the whole subtree (and lose scroll position, focus and
 * any in-flight media) on every drag of the panel.
 *
 * Measurements are coalesced into one `requestAnimationFrame` because a
 * panel resize fires `ResizeObserver` far faster than the screen can paint.
 */
export function usePhoneScale(screenRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const screen = screenRef.current;
    // The scaled document is the one child that carries the transform.
    const document_ = screen?.querySelector<HTMLElement>(
      '[data-phone-preview-document]',
    );
    if (!screen || !document_) return;

    let frame = 0;
    let lastWidth = -1;

    const apply = () => {
      frame = 0;
      const width = screen.clientWidth;
      // Sub-pixel churn from a flex or grid parent is not a resize.
      if (Math.abs(width - lastWidth) < 0.5) return;
      lastWidth = width;
      document_.style.transform = `scale(${scaleFor(width)})`;
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();

    const observer = new ResizeObserver(schedule);
    observer.observe(screen);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [screenRef]);
}