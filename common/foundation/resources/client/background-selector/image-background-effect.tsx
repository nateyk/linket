import {cn} from '@ui/utils/cn';
import type {CSSProperties} from 'react';

export type ImageBackgroundEffect = 'mono' | 'blur' | 'halftone';

export function getImageBackgroundEffectStyle(
  effect?: ImageBackgroundEffect,
  noise?: boolean,
): CSSProperties | undefined {
  const filters: string[] = [];

  if (effect === 'mono') {
    filters.push('grayscale(1)');
  } else if (effect === 'blur') {
    filters.push('blur(12px)');
  }

  if (noise) {
    filters.push('url(#noiseFilter)');
  }

  if (!filters.length && effect !== 'blur') {
    return undefined;
  }

  return {
    filter: filters.join(' '),
    transform: effect === 'blur' ? 'scale(1.04)' : undefined,
  };
}

export function ImageBackgroundEffectOverlay({
  effect,
  className,
}: {
  effect?: ImageBackgroundEffect;
  className?: string;
}) {
  if (effect !== 'halftone') {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{
        backgroundImage:
          'radial-gradient(2.25px, rgb(0, 0, 0), rgba(0, 0, 0, 0)), radial-gradient(2.25px at 1.125px 1.125px, rgb(0, 255, 255), rgba(0, 0, 0, 0)), radial-gradient(2.25px at 3.375px 1.125px, rgb(255, 0, 255), rgba(0, 0, 0, 0)), radial-gradient(2.25px at 2.25px 3.375px, rgb(255, 255, 0), rgba(0, 0, 0, 0))',
        filter: 'contrast(400%)',
        backgroundSize: '4px 4px',
        opacity: 0.75,
        mixBlendMode: 'overlay',
      }}
    />
  );
}
