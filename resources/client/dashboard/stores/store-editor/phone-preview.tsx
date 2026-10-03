import {cn} from '@ui/utils/cn';
import {ReactNode, useLayoutEffect, useRef, useState} from 'react';

/** The page is authored at a real phone width, then scaled to fit. */
const CONTENT_WIDTH = 390;

interface PhonePreviewProps {
  children: ReactNode;
  className?: string;
  /**
   * Layer painted on the screen itself, behind the scrolling content —
   * the page background. Keeping it on the screen (not inside the
   * scrolled page) glues the gradient to the viewport exactly like the
   * live page's fixed background: content scrolls over it, and the bands
   * under the Dynamic Island and above the home bar stay painted.
   */
  background?: ReactNode;
}

export function PhonePreview({
  children,
  className,
  background,
}: PhonePreviewProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [screenSize, setScreenSize] = useState({width: 0, height: 0});
  const [contentHeight, setContentHeight] = useState(0);

  const scale = screenSize.width > 0 ? screenSize.width / CONTENT_WIDTH : 1;

  useLayoutEffect(() => {
    const screen = screenRef.current;
    const inner = innerRef.current;
    if (!screen || !inner) return;

    const measureScreen = () => {
      const {clientWidth, clientHeight} = screen;
      setScreenSize(prev =>
        prev.width === clientWidth && prev.height === clientHeight
          ? prev
          : {width: clientWidth, height: clientHeight},
      );
    };
    const measureContent = () => {
      const height = inner.offsetHeight;
      setContentHeight(prev =>
        Math.abs(prev - height) < 0.5 ? prev : height,
      );
    };

    measureScreen();
    measureContent();

    const screenObserver = new ResizeObserver(measureScreen);
    screenObserver.observe(screen);
    const contentObserver = new ResizeObserver(measureContent);
    contentObserver.observe(inner);

    return () => {
      screenObserver.disconnect();
      contentObserver.disconnect();
    };
  }, []);

  // A transform does not affect layout, so the wrapper carries the
  // scaled box: the scroller gets a real range instead of the unscaled
  // 390px-wide content's height, and no phantom scroll space remains.
  const scaledWidth = CONTENT_WIDTH * scale;
  const scaledHeight =
    screenSize.height > 0
      ? Math.max(contentHeight * scale, screenSize.height)
      : contentHeight * scale;

  return (
    <div
      className={cn(
        'relative aspect-[9/19.5] select-none border-[6px] border-black rounded-[2.5rem] shadow-xl',
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

      <div
        ref={screenRef}
        className="absolute inset-0 overflow-hidden rounded-[2rem] bg-background"
      >
        {background && <div className="absolute inset-0">{background}</div>}

        {/* The one scroller: wheel/touch/keyboard scroll inside the
            screen; pt-10 clears the island, pb-6 clears the home bar. */}
        <div className="relative size-full overflow-x-hidden overflow-y-auto overscroll-contain no-scrollbar pt-10 pb-6">
          <div
            className="relative mx-auto"
            style={{width: scaledWidth, height: scaledHeight}}
          >
            <div
              ref={innerRef}
              className="absolute top-0 left-1/2 w-[390px]"
              style={{
                minHeight: scale > 0 ? screenSize.height / scale : undefined,
                transform: `translateX(-50%) scale(${scale})`,
                transformOrigin: 'top center',
              }}
            >
              {children}
            </div>
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
