import {Badge} from '@shadcn/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ProductCover} from '@ui/product-cover';
import {cn} from '@ui/utils/cn';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingBagIcon,
  StarIcon,
} from 'lucide-react';
import {useState, type CSSProperties, type ReactNode} from 'react';

export interface ProductCardClassNames {
  root?: string;
  media?: string;
  body?: string;
  title?: string;
  footer?: string;
  price?: string;
}

export interface ProductCardProps {
  images: string[];
  title: string;
  titleHref?: string;
  description?: string | null;
  tags?: string[];
  rating?: number | null;
  topRated?: boolean;
  price: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
  /** Rendered over the media (top-start), e.g. the product type chip. */
  mediaOverlay?: ReactNode;
  imageFallback?: ReactNode;
  classNames?: ProductCardClassNames;
  className?: string;
  /** Inline styles on the root (e.g. Appearance soft-pop boxShadow). */
  style?: CSSProperties;
  /**
   * Storefront / quiet surfaces: no hover shadow lift and no carousel motion
   * wrapper when there is only one image. Cover imagery sits still on hover
   * on every surface — a zooming cover reads as a generated-UI tell.
   */
  quiet?: boolean;
}

const carouselVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

export function ProductCard({
  images,
  title,
  titleHref,
  description,
  tags = [],
  rating = null,
  topRated = false,
  price,
  action,
  meta,
  mediaOverlay,
  imageFallback,
  classNames,
  className,
  style,
  quiet = false,
}: ProductCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const {trans} = useTrans();
  const reduceMotion = useReducedMotion();

  const showCarouselUI = images.length > 1;
  const safeIndex = images.length ? currentIndex % images.length : 0;

  const changeImage = (newDirection: number) => {
    if (!images.length) return;
    setDirection(newDirection);
    setCurrentIndex(prevIndex => {
      const nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) return images.length - 1;
      if (nextIndex >= images.length) return 0;
      return nextIndex;
    });
  };

  const fallbackBlock = imageFallback ?? (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <ShoppingBagIcon className="size-8 opacity-65" />
    </div>
  );

  return (
    <div
      className={cn(
        'group flex h-full w-full flex-col overflow-hidden isolate rounded-card bg-card text-card-foreground ring-1 ring-foreground/10',
        !quiet && 'transition-shadow duration-200 hover:shadow-md',
        classNames?.root,
        className,
      )}
      style={style}
    >
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden',
          classNames?.media,
        )}
      >
        {images.length === 0 ? (
          fallbackBlock
        ) : quiet && !showCarouselUI ? (
          // Storefront single cover: skip AnimatePresence/spring chrome.
          <ProductCover
            cover={{url: images[0]}}
            alt={title}
            aspect=""
            className="h-full w-full"
            fallback={fallbackBlock}
          />
        ) : (
          <>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={safeIndex}
                custom={direction}
                variants={carouselVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={
                  reduceMotion
                    ? {duration: 0}
                    : {
                        x: {type: 'spring', stiffness: 300, damping: 30},
                        opacity: {duration: 0.2},
                      }
                }
                className="absolute h-full w-full"
              >
                <ProductCover
                  cover={{url: images[safeIndex]}}
                  alt={title}
                  aspect=""
                  className="h-full w-full"
                  fallback={fallbackBlock}
                />
              </motion.div>
            </AnimatePresence>

            {showCarouselUI && (
              <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
                <button
                  type="button"
                  onClick={() => changeImage(-1)}
                  aria-label={trans({message: 'Previous image'})}
                  className="flex size-8 items-center justify-center rounded-button bg-foreground/60 text-background transition-colors hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => changeImage(1)}
                  aria-label={trans({message: 'Next image'})}
                  className="flex size-8 items-center justify-center rounded-button bg-foreground/60 text-background transition-colors hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>
            )}

            {tags.length > 0 && (
              <div className="absolute start-3 top-3 flex gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-background/70 backdrop-blur-sm"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {rating != null && (
              <div className="absolute end-3 top-3">
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 bg-background/70 backdrop-blur-sm"
                >
                  <StarIcon className="size-4 fill-current text-warning" />{' '}
                  {rating}
                </Badge>
              </div>
            )}
            {showCarouselUI && (
              <div className="absolute start-0 end-0 bottom-1 flex justify-center">
                {images.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    aria-label={trans({
                      message: 'Go to image :number',
                      values: {number: index + 1},
                    })}
                    aria-current={safeIndex === index ? 'true' : undefined}
                    className="flex size-6 shrink-0 items-center justify-center rounded-full focus-visible:outline-2"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-1.5 rounded-full bg-background/60 ring-1 ring-foreground/60 transition-all motion-reduce:transition-none',
                        safeIndex === index ? 'w-4' : 'w-1.5',
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {mediaOverlay && (
          <div className="absolute start-3 top-3 z-10">{mediaOverlay}</div>
        )}
      </div>

      <div className={cn('flex flex-1 flex-col gap-3 p-4', classNames?.body)}>
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              'line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-semibold',
              classNames?.title,
            )}
          >
            {titleHref ? <a href={titleHref}>{title}</a> : title}
          </h3>
          {topRated && (
            <Badge variant="outline" className="shrink-0">
              <Trans message="Top rated" />
            </Badge>
          )}
        </div>

        {description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}

        {meta}

        <div
          className={cn(
            'mt-auto flex items-center justify-between gap-2 pt-1',
            classNames?.footer,
          )}
        >
          <div
            className={cn(
              'text-sm leading-none font-semibold',
              classNames?.price,
            )}
          >
            {price}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
