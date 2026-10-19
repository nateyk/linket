import {BriefcaseBusinessIcon} from 'lucide-react';
import {useState} from 'react';
import {cn} from '@ui/utils/cn';
import {Trans} from '@ui/i18n/trans';

export function ServiceGallery({
  cover,
  images,
  title,
}: {
  cover?: {url: string} | null;
  images: {id: number; url: string}[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  // The cover leads. It is the image the creator picked to represent the
  // service, and a service with a cover but no gallery must still show one.
  // A cover that is also in the gallery is not repeated.
  const media = [
    ...(cover?.url ? [{id: -1, url: cover.url}] : []),
    ...images.filter(image => image.url !== cover?.url),
  ];
  const active = media[activeIndex];

  if (!media.length) {
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
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((image, index) => (
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
