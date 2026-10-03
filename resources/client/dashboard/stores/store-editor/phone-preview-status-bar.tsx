import {BatteryFull, Signal, Wifi} from 'lucide-react';
import {memo} from 'react';
import {PHONE_GEOMETRY} from './phone-preview.constants';

/**
 * Device chrome, not part of the page: it sits above the content, ignores
 * pointer events and stays out of the accessibility tree. Memoised because it
 * never changes and must not re-render with the frame around it.
 */
export const PhoneStatusBar = memo(function PhoneStatusBar() {
  return (
    <div
      aria-hidden
      style={{height: PHONE_GEOMETRY.safeArea.top}}
      className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-center justify-between px-7 text-[15px] font-medium text-black/65"
    >
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-1.5">
        <Signal className="size-4" strokeWidth={2.5} />
        <Wifi className="size-4" strokeWidth={2.5} />
        <BatteryFull className="size-5" strokeWidth={2} />
      </span>
    </div>
  );
});