'use client';
import {cn} from '@ui/utils/cn';
import {normalizeMediaUrl} from '@common/uploads/normalize-media-url';
import {useState} from 'react';

export function ProductCover({
  cover,
  className,
  aspect = 'aspect-video',
}: {
  cover?: {url: string} | null;
  className?: string;
  aspect?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const normalizedUrl = cover?.url
    ? normalizeMediaUrl(cover.url) || cover.url
    : null;

  if (!normalizedUrl || imageError) {
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
      alt=""
      onError={() => setImageError(true)}
      className={cn('w-full object-cover', aspect, className)}
    />
  );
}
