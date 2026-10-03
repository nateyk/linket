import {cn} from '@ui/utils/cn';
import {CSSProperties, ReactNode, useRef} from 'react';
import {
  PHONE_FRAME_ASPECT,
  PHONE_PREVIEW_DOCUMENT_STYLE,
  PHONE_PREVIEW_SCREEN_STYLE,
} from './phone-preview.constants';
import {PhoneHomeIndicator} from './phone-preview-home-indicator';
import {PhoneStatusBar} from './phone-preview-status-bar';
import {usePhoneScale} from './use-phone-scale';
import back from './iphone-14-pro-back.svg';
import front from './iphone-14-pro-front.svg';

interface PhonePreviewProps {
  children: ReactNode;
  className?: string;
  /** Escape hatch for the fit rules; the frame's own ratio wins by default. */
  style?: CSSProperties;
}

/**
 * An iPhone 14 Pro viewport: the page inside runs at the device's own logical
 * size (393 × 852) and only the transform shrinks it, so media queries, `dvh`
 * units and `position: fixed` resolve as they do on the phone.
 *
 * Layer order, bottom to top:
 *
 *   0  iphone-14-pro-back.svg   body, bezel, side buttons
 *   1  .screen                  the scaled page, the only clipped box
 *   2  device chrome            status bar, home indicator (device pixels)
 *   3  iphone-14-pro-front.svg  Dynamic Island, camera, glass highlights
 *
 * The front plate is transparent to clicks, so the page underneath keeps its
 * scroll, its nav and its focus.
 */
export function PhonePreview({children, className, style}: PhonePreviewProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  usePhoneScale(screenRef);

  return (
    <div
      className={cn('relative select-none', className)}
      style={{aspectRatio: PHONE_FRAME_ASPECT, ...style}}
    >
      <img
        src={back}
        alt=""
        aria-hidden
        draggable={false}
        decoding="async"
        width={360}
        height={730}
        className="pointer-events-none absolute inset-0 z-0 size-full select-none"
      />

      <div
        ref={screenRef}
        className="screen absolute z-[1] overflow-hidden bg-background"
        style={PHONE_PREVIEW_SCREEN_STYLE}
      >
        <div style={PHONE_PREVIEW_DOCUMENT_STYLE} data-phone-preview-document>
          {children}

          <PhoneStatusBar />
          <PhoneHomeIndicator />
        </div>
      </div>

      <img
        src={front}
        alt=""
        aria-hidden
        draggable={false}
        decoding="async"
        width={360}
        height={730}
        className="pointer-events-none absolute inset-0 z-[3] size-full select-none"
      />
    </div>
  );
}