import {cn} from '@ui/utils/cn';
import {BatteryFull, Signal, Wifi} from 'lucide-react';
import {CSSProperties, ReactNode, useLayoutEffect, useRef, useState} from 'react';
import back from './iphone-14-pro-back.svg';
import front from './iphone-14-pro-front.svg';

/**
 * A real iPhone 14 Pro viewport.
 *
 * The frame is the device artwork: the back plate carries the bezel and the
 * side buttons, the front plate carries the Dynamic Island and the glass
 * highlights. Between them the screen is a genuine 393 × 852 CSS-pixel
 * viewport scaled to fit, so media queries, `dvh` units and `position: fixed`
 * inside it resolve exactly as they do on the phone — a transformed element
 * would otherwise report the editor's window width instead.
 *
 * The screen box is positioned as a percentage of the artwork's own viewBox
 * (95.25 × 193.14585), so it stays aligned with the drawn bezel at any frame
 * width without hardcoding device pixels.
 */
const SCREEN_WIDTH = 393;
const SCREEN_HEIGHT = 852;

/**
 * iPhone 14 Pro insets: the status bar plus Dynamic Island above, the home
 * indicator below. Published on the scaled box so the page inside reserves the
 * same space it does on the device.
 */
const SAFE_TOP = '59px';
const SAFE_BOTTOM = '34px';

interface PhonePreviewProps {
  children: ReactNode;
  className?: string;
}

export function PhonePreview({children, className}: PhonePreviewProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [screenWidth, setScreenWidth] = useState(0);

  // The screen's inner width is the real viewport the page is authored for;
  // --s maps 393 onto it and the page inside is laid out at full size.
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

  return (
    <div
      className={cn('relative aspect-[95.25/193.14585] select-none', className)}
      style={{'--s': scale} as CSSProperties}
    >
      {/* Device body: bezel, side buttons and back glass. */}
      <img
        src={back}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 size-full select-none"
      />

      {/* The only clipped box on the frame: the page fills it edge to edge
          and takes its rounded corners from here. */}
      <div
        ref={screenRef}
        className="screen absolute z-[1] overflow-hidden bg-background"
        style={{
          left: '5.251%',
          top: '2.2446%',
          width: '89.498%',
          height: '95.511%',
          borderRadius: '13.475% / 6.227%',
        }}
      >
        {/* The 393 × 852 document. It is absolutely positioned so the
            transform leaves no phantom scroll space around it, and it
            carries the device insets for the page to lay itself out with. */}
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={
            {
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              transform: 'scale(var(--s))',
              '--safe-top': SAFE_TOP,
              '--safe-bottom': SAFE_BOTTOM,
            } as CSSProperties
          }
        >
          {children}

          {/* Status bar: device chrome above the page, never interactive. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex h-[59px] items-center justify-between px-7 text-[15px] font-medium text-black/65"
          >
            <span className="tabular-nums">9:41</span>
            <span className="flex items-center gap-1.5">
              <Signal className="size-4" strokeWidth={2.5} />
              <Wifi className="size-4" strokeWidth={2.5} />
              <BatteryFull className="size-5" strokeWidth={2} />
            </span>
          </div>

          {/* Home indicator. Sits with the rest of the chrome in device
              pixels so it keeps its proportion at every frame width. */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-1/2 z-[2] h-1 w-28 -translate-x-1/2 rounded-full bg-black/70"
          />
        </div>
      </div>

      {/* Island and glass highlights, over the page but transparent to
          clicks so the page and its nav stay reachable. */}
      <img
        src={front}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] size-full select-none"
      />
    </div>
  );
}