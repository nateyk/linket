import {cn} from '@ui/utils/cn';
import {ReactNode, useLayoutEffect, useRef, useState} from 'react';

/**
 * A real iPhone 14 Pro viewport: the screen is exactly 393 × 852 CSS
 * pixels and the frame is drawn around it (screen + 6px bezel), so the
 * ratio is exact, nothing is stretched, and viewport units inside the
 * frame behave like they do on the phone.
 */
const SCREEN_WIDTH = 393;
const SCREEN_HEIGHT = 852;

interface PhonePreviewProps {
  children: ReactNode;
  className?: string;
}

export function PhonePreview({children, className}: PhonePreviewProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [screenWidth, setScreenWidth] = useState(0);

  // The screen's inner width is the real viewport the page is authored
  // for; scale maps 393 → that width exactly.
  const scale = screenWidth > 0 ? screenWidth / SCREEN_WIDTH : 0;

  useLayoutEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    const measure = () => {
      const width = screen.clientWidth;
      setScreenWidth(prev =>
        Math.abs(prev - width) < 0.5 ? prev : width,
      );
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(screen);
    return () => observer.disconnect();
  }, []);

  // A transform does not affect layout, so the wrapper carries the
  // scaled box: its footprint equals the painted area and no phantom
  // scroll space remains around the 393×852 document.
  const scaledWidth = SCREEN_WIDTH * scale;
  const scaledHeight = SCREEN_HEIGHT * scale;

  return (
    <div
      className={cn(
        'relative inline-block select-none border-[6px] border-black rounded-[2.5rem] shadow-xl',
        className,
      )}
    >
      {/* Side buttons sit on the bezel, outside the screen. */}
      <span
        aria-hidden
        className="absolute -right-[9px] top-24 h-12 w-[3px] rounded-r bg-black"
      />
      <span
        aria-hidden
        className="absolute -left-[9px] top-16 h-6 w-[3px] rounded-l bg-black"
      />
      <span
        aria-hidden
        className="absolute -left-[9px] top-28 h-10 w-[3px] rounded-l bg-black"
      />
      <span
        aria-hidden
        className="absolute -left-[9px] top-40 h-10 w-[3px] rounded-l bg-black"
      />

      {/* The screen: exact 393/852 ratio, sized by the frame width. */}
      <div
        ref={screenRef}
        className="relative block aspect-[393/852] w-full overflow-hidden rounded-[2rem] bg-background"
      >
        {/* Wrapper carries the scaled box so its footprint equals the
            painted area; the 393×852 document inside is absolute. */}
        <div
          className="relative"
          style={{width: scaledWidth, height: scaledHeight}}
        >
          <div
            className="absolute top-0 left-1/2 h-[852px] w-[393px]"
            style={{
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            {children}
          </div>
        </div>

        {/* Dynamic Island */}
        <span className="pointer-events-none absolute top-2 left-1/2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
        {/* Home indicator */}
        <span className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-black/70" />
      </div>
    </div>
  );
}
