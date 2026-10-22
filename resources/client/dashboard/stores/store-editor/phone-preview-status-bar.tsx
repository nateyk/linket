import {BatteryFull, Signal, Wifi} from 'lucide-react';
import {memo} from 'react';
import {
  PHONE_GEOMETRY,
  PHONE_STATUS_BAR_TIME_FONT_SIZE,
} from './phone-preview.constants';

/**
 * Device chrome, not part of the page: it sits above the content, stays out
 * of the accessibility tree and lets taps pass through everywhere except its
 * own glyphs — like a real status bar, whose clock and indicators swallow
 * touches instead of forwarding them to the page below. Memoised because it
 * never changes and must not re-render with the frame around it.
 */
export const PhoneStatusBar = memo(function PhoneStatusBar() {
  return (
    <div
      aria-hidden
      style={{
        height: PHONE_GEOMETRY.safeArea.top,
        fontSize: PHONE_STATUS_BAR_TIME_FONT_SIZE,
      }}
      className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-center justify-between px-7 font-medium text-black/65"
    >
      <span className="pointer-events-auto tabular-nums">9:41</span>
      <span className="pointer-events-auto flex items-center gap-1.5">
        <Signal className="size-4" strokeWidth={2.5} />
        <Wifi className="size-4" strokeWidth={2.5} />
        <BatteryFull className="size-5" strokeWidth={2} />
      </span>
    </div>
  );
});
