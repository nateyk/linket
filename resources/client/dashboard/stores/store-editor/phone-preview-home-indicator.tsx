import {memo} from 'react';

/**
 * Device chrome. Sits in device pixels inside the scaled document so it keeps
 * its proportion at every frame width, and takes no clicks so the page's own
 * bottom nav stays reachable right above it.
 */
export const PhoneHomeIndicator = memo(function PhoneHomeIndicator() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-2 left-1/2 z-[2] h-1 w-28 -translate-x-1/2 rounded-full bg-black/70"
    />
  );
});