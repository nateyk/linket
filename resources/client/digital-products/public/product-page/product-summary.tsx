import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import type {ReactNode} from 'react';
import {
  BookOpenIcon,
  FileDownIcon,
  GraduationCapIcon,
  type LucideIcon,
} from 'lucide-react';
import type {
  PublicBiolink,
  PublicCreator,
  PublicDigitalProduct,
} from '../digital-product-public-pages';
import type {ProductReviewsSummary} from '../product-reviews-block';
import {RatingStars} from '../product-rating-stars';
import {CreatorIdentity} from './creator-identity';
import {productDeck} from './product-description';

export function ProductSummary({
  product,
  creator,
  biolink,
  reviews,
}: {
  product: PublicDigitalProduct;
  creator?: PublicCreator | null;
  biolink: PublicBiolink;
  reviews?: ProductReviewsSummary;
}) {
  const isCourse = !!product.is_course;
  const average = reviews?.average;
  const reviewCount = reviews?.rating_stats?.total ?? 0;
  const showRating = typeof average === 'number' && reviewCount > 0;

  const stats: {
    id: string;
    icon: LucideIcon;
    label: ReactNode;
    value: number;
  }[] = [];
  if (isCourse) {
    if (
      typeof product.lessons_count === 'number' &&
      product.lessons_count > 0
    ) {
      stats.push({
        id: 'lessons',
        icon: GraduationCapIcon,
        label: <Trans message="Lessons" />,
        value: product.lessons_count,
      });
    }
    if (
      typeof product.chapters_count === 'number' &&
      product.chapters_count > 0
    ) {
      stats.push({
        id: 'chapters',
        icon: BookOpenIcon,
        label: <Trans message="Chapters" />,
        value: product.chapters_count,
      });
    }
    if (typeof product.files_count === 'number' && product.files_count > 0) {
      stats.push({
        id: 'files',
        icon: FileDownIcon,
        label: <Trans message="Files" />,
        value: product.files_count,
      });
    }
  }

  // The gallery overlay already carries the product type and courses get
  // stat tiles below, so the meta row carries the file count for
  // download/ebook/audio products — every type leaves a filled meta row.
  const filesChip =
    !isCourse && typeof product.files_count === 'number' ? (
      <StatChip icon={FileDownIcon}>
        <Trans
          message="[one :count file|other :count files]"
          values={{count: product.files_count}}
        />
      </StatChip>
    ) : null;

  // Creator-authored description, distilled to a lead line. Renders nothing
  // when the description is empty so there is no blank box under the H1.
  const deck = productDeck(product.description);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
        {product.title}
      </h1>

      {deck && (
        <p className="max-w-[70ch] text-base leading-6 text-[var(--biolink-muted-text)]">
          {deck}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {showRating && (
          <div className="flex items-center gap-2 text-sm">
            <RatingStars value={Math.round(average)} />
            <span className="font-medium text-[var(--biolink-text)]">
              {average.toFixed(1)}
            </span>
            <span className="text-[var(--biolink-muted-text)]">
              (<Trans message=":count reviews" values={{count: reviewCount}} />)
            </span>
          </div>
        )}
        <CreatorIdentity creator={creator} biolink={biolink} />
        {filesChip}
      </div>

      {stats.length > 0 && (
        <dl
          className={cn(
            'grid grid-cols-2 gap-3',
            stats.length > 2 && 'sm:grid-cols-3',
          )}
        >
          {stats.map(stat => (
            <div
              key={stat.id}
              className="rounded-card border border-[var(--biolink-border)] bg-[var(--biolink-surface)] p-4"
            >
              <stat.icon
                className="size-4 text-[var(--biolink-muted-text)]"
                aria-hidden="true"
              />
              <dt className="mt-2 text-xs text-[var(--biolink-muted-text)]">
                {stat.label}
              </dt>
              <dd className="text-sm font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function StatChip({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--biolink-muted-text)]">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
