import {cn} from '@ui/utils/cn';
import type {ReactNode} from 'react';
import './auth-starfield.css';

type StarfieldProps = {
  className?: string;
  children?: ReactNode;
};

// Stable coordinates avoid random SSR/hydration differences. Each layer has
// different star sizes and drift speeds, with no browser animation loop.
function fraction(n: number) {
  const value = Math.sin(n * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

const layers = Array.from({length: 5}, (_, layer) =>
  Array.from({length: 18}, (_, index) => {
    const seed = layer * 37 + index + 1;
    return {
      x: Math.round(fraction(seed * 1.7) * 1000),
      y: Math.round(fraction(seed * 4.1) * 820),
      radius: 0.65 + fraction(seed * 6.3) * (0.7 + layer * 0.2),
      delay: -(fraction(seed * 3.4) * 9),
      duration: 5 + fraction(seed * 8.2) * 7,
    };
  }),
);

/**
 * A lightweight Starfield backdrop for Linket's auth hero.
 * Decorative SVG layers use semantic theme colors, work without WebGL,
 * and become completely static for prefers-reduced-motion.
 */
export function Starfield({className, children}: StarfieldProps) {
  return (
    <div
      data-slot="starfield"
      className={cn('relative isolate overflow-hidden', className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="auth-starfield-haze absolute inset-0" />
        <svg
          className="absolute inset-0 size-full text-primary"
          viewBox="0 0 1000 820"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
          aria-hidden="true"
        >
          {layers.map((stars, layer) => (
            <g
              key={layer}
              className="auth-starfield-layer"
              style={{animationDuration: `${32 + layer * 11}s`}}
            >
              {stars.map((star, index) => (
                <circle
                  key={index}
                  className="auth-starfield-star"
                  cx={star.x}
                  cy={star.y}
                  r={star.radius}
                  fill="currentColor"
                  style={{
                    animationDelay: `${star.delay}s`,
                    animationDuration: `${star.duration}s`,
                  }}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}
