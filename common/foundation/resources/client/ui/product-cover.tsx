'use client';
import {cn} from '@ui/utils/cn';
import {normalizeMediaUrl} from '@common/uploads/normalize-media-url';
import {useState} from 'react';
import type {ReactNode} from 'react';

export function ProductCover({
  cover,
  alt = '',
  fallback,
  className,
  aspect = 'aspect-video',
  loading = 'lazy',
}: {
  cover?: {url: string} | null;
  alt?: string;
  fallback?: ReactNode;
  className?: string;
  aspect?: string;
  /** Defaults to lazy; above-the-fold heroes (e.g. the product gallery) should opt out with `eager`. */
  loading?: 'lazy' | 'eager';
}) {
  const [imageError, setImageError] = useState(false);
  const normalizedUrl = cover?.url
    ? normalizeMediaUrl(cover.url) || cover.url
    : null;

  if (!normalizedUrl || imageError) {
    if (fallback) return fallback;

    return (
      <div
        className={cn(
          'flex aspect-video items-center justify-center rounded-card bg-muted text-muted-foreground',
          className,
        )}
      >
        No cover
      </div>
    );
  }

  return (
    <img
      src={normalizedUrl}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setImageError(true)}
      className={cn('w-full object-cover', aspect, className)}
    />
  );
}
