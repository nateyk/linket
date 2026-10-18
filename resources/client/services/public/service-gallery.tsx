import {BriefcaseBusinessIcon} from 'lucide-react';
import {useState} from 'react';
import {cn} from '@ui/utils/cn';
import {Trans} from '@ui/i18n/trans';

export function ServiceGallery({
  images,
  title,
}: {
  images: {id: number; url: string}[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (!images.length) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-card bg-[var(--biolink-surface-muted)] text-[var(--biolink-muted-text)]">
        <BriefcaseBusinessIcon className="size-10 opacity-65" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video overflow-hidden rounded-card bg-[var(--biolink-surface-muted)]">
        <img
          src={active?.url}
          alt={title}
          className="size-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`${title} ${index + 1}`}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-card-xs outline-none ring-2 ring-transparent focus-visible:ring-ring',
                index === activeIndex && 'ring-primary',
              )}
            >
              <img
                src={image.url}
                alt=""
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      <span className="sr-only">
        <Trans message="Service gallery" />
      </span>
    </div>
  );
}
