/**
 * iPhone 14 Pro geometry, in one place.
 *
 * Source artwork: `iphone-14-pro-back.svg` (body, bezel, side buttons) and
 * `iphone-14-pro-front.svg` (Dynamic Island, camera, glass highlights),
 * split from a public-domain iPhone 14 Pro vector. Both share one `viewBox`,
 * and the screen box below is expressed as a percentage of that viewBox so the
 * page stays aligned with the drawn bezel at any frame width.
 *
 * Every number is either read out of the artwork or the device's own logical
 * viewport. `phone-preview.geometry.test.ts` re-derives the screen box from
 * the SVG and fails if the two drift apart; see the regeneration notes in
 * phone-preview.tsx before changing anything here.
 */
import type {CSSProperties} from 'react';

export const PHONE_GEOMETRY = {
  /** The artwork's own coordinate system, shared by both SVGs. */
  viewBox: {
    width: 95.25,
    height: 193.14585,
  },

  /**
   * The screen, as a percentage of the viewBox. Inset from the drawn glass by
   * the bezel, equally on all four sides.
   */
  screen: {
    left: 5.251,
    top: 2.2446,
    width: 89.498,
    height: 95.511,
  },

  /**
   * Screen corner radius as a percentage of the screen box: horizontal over
   * vertical, matching CSS `border-radius`.
   */
  radius: {
    horizontal: 13.475,
    vertical: 6.227,
  },

  /**
   * The page's logical viewport. The screen is this many CSS pixels wide and
   * tall before scaling, so media queries, `dvh` units and `position: fixed`
   * inside the frame resolve exactly as they do on the device.
   */
  viewport: {
    width: 393,
    height: 852,
  },

  /** Device insets: status bar plus Dynamic Island above, indicator below. */
  safeArea: {
    top: 59,
    bottom: 34,
  },
} as const;

/** `aspect-ratio` for the frame, from the artwork's own ratio. */
export const PHONE_FRAME_ASPECT = `${PHONE_GEOMETRY.viewBox.width} / ${PHONE_GEOMETRY.viewBox.height}`;

/**
 * The same ratio as a plain number, for arithmetic in `calc()` when fitting
 * the frame to a container.
 */
export const PHONE_FRAME_ASPECT_RATIO =
  PHONE_GEOMETRY.viewBox.width / PHONE_GEOMETRY.viewBox.height;

/**
 * The screen box and the page viewport, ready for a `style` prop.
 *
 * The box is a percentage of the artwork; the document inside it is the
 * device's own logical size, unscaled by CSS so the page lays out at 393 × 852
 * and only the transform shrinks it. `--s` is written by `usePhoneScale`.
 */
export const PHONE_PREVIEW_SCREEN_STYLE: CSSProperties = {
  left: `${PHONE_GEOMETRY.screen.left}%`,
  top: `${PHONE_GEOMETRY.screen.top}%`,
  width: `${PHONE_GEOMETRY.screen.width}%`,
  height: `${PHONE_GEOMETRY.screen.height}%`,
  borderRadius: `${PHONE_GEOMETRY.radius.horizontal}% / ${PHONE_GEOMETRY.radius.vertical}%`,
};

/** Style for the scaled page document inside the screen. */
export const PHONE_PREVIEW_DOCUMENT_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: PHONE_GEOMETRY.viewport.width,
  height: PHONE_GEOMETRY.viewport.height,
  transformOrigin: 'top left',
  '--safe-top': `${PHONE_GEOMETRY.safeArea.top}px`,
  '--safe-bottom': `${PHONE_GEOMETRY.safeArea.bottom}px`,
} as CSSProperties;

/** Frame height for a given width, from the artwork's own ratio. */
export function frameHeightFor(frameWidth: number): number {
  const {width, height} = PHONE_GEOMETRY.viewBox;
  return (frameWidth * height) / width;
}

/** Widest frame that still fits `availableHeight` without cropping. */
export function frameWidthFor(availableHeight: number): number {
  const {width, height} = PHONE_GEOMETRY.viewBox;
  return (availableHeight * width) / height;
}

/**
 * Map the page's logical width onto the screen's rendered width.
 */
export function scaleFor(screenWidth: number): number {
  return screenWidth / PHONE_GEOMETRY.viewport.width;
}

/**
 * Status-bar clock size, in px. The preview draws a real iPhone 14 Pro
 * status bar (59px tall, 9:41, tabular numerals), so the time keeps the
 * device's own 15px — device chrome, not app typography. Recorded as an
 * exemption to DESIGN.md's Two-Size Rule (which forbids 15px everywhere
 * else); do not reuse this value for UI text.
 */
export const PHONE_STATUS_BAR_TIME_FONT_SIZE = 15;
