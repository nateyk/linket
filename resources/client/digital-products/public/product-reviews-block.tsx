import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Separator} from '@shadcn/separator';
import {apiClient} from '@common/http/query-client';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  BadgeCheckIcon,
  CircleAlertIcon,
  StarIcon,
  StarOffIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';
import {RatingStars} from './product-rating-stars';
import type {PublicDigitalProduct} from './digital-product-public-pages';

/** API payload shape from the public reviews endpoint. */
type PublicReview = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
  verified?: boolean;
  created_at: string | null;
};

/**
 * Display shape modeled on Reviews1 — keep API fields mapped here so the
 * list UI stays stable if the payload grows (avatar URL, etc.).
 */
export type CustomerReview = {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  author: {
    name: string | null;
    avatar?: string | null;
  };
  date: string | null;
  verified?: boolean;
};

type ReviewsResponse = {
  data?: PublicReview[];
  summary?: {
    average?: number | null;
    rating_stats?: {
      counts?: Record<string, number>;
      percentages?: Record<string, number>;
      total?: number;
    };
  };
};

export type ProductReviewsSummary = NonNullable<ReviewsResponse['summary']>;

const REVIEWS_PER_PAGE = 5;

function toCustomerReview(review: PublicReview): CustomerReview {
  return {
    id: review.id,
    rating: review.stars ?? 0,
    title: review.title,
    content: review.review,
    author: {
      name: review.buyer_name,
    },
    date: review.created_at,
    verified: review.verified,
  };
}

export function ProductReviewsBlock({
  product,
  biolinkId,
  onSummary,
}: {
  product: PublicDigitalProduct;
  biolinkId: number;
  onSummary?: (summary: ProductReviewsSummary) => void;
}) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<ProductReviewsSummary>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const baseUrl = `/api/v1/public/biolinks/${biolinkId}/digital-products/${product.id}/reviews`;
  const visibleReviews = showAllReviews
    ? reviews
    : reviews.slice(0, REVIEWS_PER_PAGE);

  const average = summary?.average ?? 0;
  const total = summary?.rating_stats?.total ?? 0;
  const counts = summary?.rating_stats?.counts ?? {};
  const percentages = summary?.rating_stats?.percentages ?? {};

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const {data: payload} = await apiClient.get<ReviewsResponse>(baseUrl);
      setReviews(payload.data ?? []);
      setSummary(payload.summary);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (summary) {
      onSummary?.(summary);
    }
  }, [summary, onSummary]);

  return (
    <section
      className="flex w-full flex-col gap-6"
      aria-labelledby="product-reviews-heading"
    >
      <div>
        <h2
          id="product-reviews-heading"
          className="text-lg font-semibold tracking-tight text-[var(--biolink-text)] md:text-xl"
        >
          <Trans message="Customer Reviews" />
        </h2>
        {(loading || total > 0) && (
          <div className="mt-2 flex items-center gap-3">
            {!loading && (
              <RatingStars
                value={Math.round(average)}
                starClassName="size-5"
              />
            )}
            <p className="text-sm text-[var(--biolink-muted-text)]">
              {loading ? (
                '—'
              ) : (
                <Trans
                  message=":average out of 5 · :count reviews"
                  values={{average: average.toFixed(1), count: total}}
                />
              )}
            </p>
          </div>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="flex w-6 items-center justify-end gap-0.5 text-[var(--biolink-muted-text)]">
                {star}
                <StarIcon className="size-3 fill-current text-warning" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--biolink-surface-strong)]">
                <div
                  className="h-full rounded-full bg-warning"
                  style={{width: `${percentages[star] ?? 0}%`}}
                />
              </div>
              <span className="w-4 text-end text-[var(--biolink-muted-text)] tabular-nums">
                {counts[star] ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}

      {reviews.length ? (
        <div>
          {visibleReviews.map((review, index) => (
            <div key={review.id}>
              {index > 0 && (
                <Separator className="my-6 bg-[var(--biolink-border)]" />
              )}
              <ReviewRow review={toCustomerReview(review)} />
            </div>
          ))}
          {reviews.length > visibleReviews.length && (
            <button
              type="button"
              onClick={() => setShowAllReviews(true)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-card p-3 text-sm font-medium text-[var(--biolink-text)] transition-colors hover:bg-[var(--biolink-surface)]"
            >
              <Trans
                message="Show all :count reviews"
                values={{count: reviews.length}}
              />
            </button>
          )}
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-dashed p-6 text-center text-sm text-[var(--biolink-muted-text)]">
            <StarOffIcon className="size-5" />
            <Trans message="No reviews yet." />
          </div>
        )
      )}

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <CircleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <Trans message="Unable to load reviews." />
          </span>
          <Button
            size="sm"
            variant="outline"
            color="danger"
            onClick={() => void load()}
          >
            <Trans message="Retry" />
          </Button>
        </div>
      )}

      <p
        className={cn(
          'text-center text-sm text-[var(--biolink-muted-text)]',
          (loading || total > 0 || reviews.length > 0 || error) &&
            'border-t border-[var(--biolink-border)] pt-4',
        )}
      >
        <Trans message="Verified buyers can leave a review from" />{' '}
        <Link
          to="/my-portal"
          className="font-medium text-[var(--biolink-accent,var(--color-primary))] underline-offset-4 hover:underline"
        >
          <Trans message="My Portal" />
        </Link>
      </p>
    </section>
  );
}

function ReviewRow({review}: {review: CustomerReview}) {
  return (
    <article className="flex flex-col gap-3">
      <div>
        <RatingStars value={review.rating} />
        {review.title && (
          <h3 className="mt-2 text-sm font-medium text-[var(--biolink-text)]">
            {review.title}
          </h3>
        )}
      </div>
      {review.content && (
        <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--biolink-muted-text)]">
          {review.content}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Avatar.Root size="sm">
          {review.author.avatar ? (
            <Avatar.Image
              src={review.author.avatar}
              alt={review.author.name ?? undefined}
            />
          ) : null}
          <Avatar.ColorFallback>{review.author.name}</Avatar.ColorFallback>
        </Avatar.Root>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-[var(--biolink-text)]">
            {review.author.name ?? <Trans message="Verified buyer" />}
          </span>
          {review.verified && (
            <Badge variant="positive">
              <BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />
              <Trans message="Verified Purchase" />
            </Badge>
          )}
          {review.date && (
            <>
              <span
                className="text-[var(--biolink-muted-text)]"
                aria-hidden="true"
              >
                ·
              </span>
              <time
                className="text-[var(--biolink-muted-text)]"
                dateTime={review.date}
              >
                <FormattedDate date={review.date} />
              </time>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
