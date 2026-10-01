import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {apiClient} from '@common/http/query-client';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
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

type PublicReview = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
  verified?: boolean;
  created_at: string | null;
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
      className="flex w-full flex-col gap-4"
      aria-labelledby="product-reviews-heading"
    >
      <h2
        id="product-reviews-heading"
        className="text-lg font-semibold tracking-tight text-[var(--biolink-text)]"
      >
        <Trans message="Customer reviews" />
      </h2>
      <div className="grid items-stretch gap-4">
        <SummaryCard summary={summary} loading={loading} />

        {reviews.length ? (
          <div className="divide-y divide-[var(--biolink-border)] rounded-card border border-[var(--biolink-border)]">
            {visibleReviews.map(review => (
              <div key={review.id} className="p-5">
                <ReviewRow review={review} />
              </div>
            ))}
            {reviews.length > visibleReviews.length && (
              <button
                type="button"
                onClick={() => setShowAllReviews(true)}
                className="flex w-full items-center justify-center gap-2 rounded-b-card p-3 text-sm font-medium text-[var(--biolink-text)] transition-colors hover:bg-[var(--biolink-surface)]"
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
      </div>

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
    </section>
  );
}

function SummaryCard({
  summary,
  loading,
}: {
  summary?: ProductReviewsSummary;
  loading: boolean;
}) {
  const average = summary?.average ?? 0;
  const counts = summary?.rating_stats?.counts ?? {};
  const percentages = summary?.rating_stats?.percentages ?? {};
  const total = summary?.rating_stats?.total ?? 0;

  return (
    <div className="flex flex-col rounded-card border border-[var(--biolink-border)] p-5">
      <div className="flex items-center gap-3">
        <p className="text-4xl leading-none font-semibold tracking-tight">
          {loading ? '—' : average.toFixed(1)}
        </p>
        <div className="flex flex-col gap-1">
          <RatingStars value={Math.round(average)} />
          <p className="text-xs text-[var(--biolink-muted-text)]">
            <Trans
              message=":average out of 5 · :count reviews"
              values={{average: average.toFixed(1), count: total}}
            />
          </p>
        </div>
      </div>

      {!loading && (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-[var(--biolink-border)] pt-4">
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
              <span className="w-4 text-end text-[var(--biolink-muted-text)]">
                {counts[star] ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-[var(--biolink-border)] pt-4">
        <p className="text-center text-sm text-[var(--biolink-muted-text)]">
          <Trans message="Verified buyers can leave a review from" />{' '}
          <Link
            to="/my-order"
            className="font-medium text-[var(--biolink-accent,var(--color-primary))] underline-offset-4 hover:underline"
          >
            <Trans message="My Orders" />
          </Link>
        </p>
      </div>
    </div>
  );
}

function ReviewRow({review}: {review: PublicReview}) {
  return (
    <article className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <RatingStars value={review.stars ?? 0} />
        {review.created_at && (
          <time
            className="shrink-0 text-xs text-[var(--biolink-muted-text)]"
            dateTime={review.created_at}
          >
            <FormattedDate date={review.created_at} />
          </time>
        )}
      </div>
      {review.title && <h3 className="text-sm font-semibold">{review.title}</h3>}
      {review.review && (
        <p className="text-sm leading-6 whitespace-pre-line text-[var(--biolink-muted-text)]">
          {review.review}
        </p>
      )}
      <div className="mt-1 flex items-center gap-2">
        <Avatar.Root size="sm">
          <Avatar.ColorFallback>
            {review.buyer_name}
          </Avatar.ColorFallback>
        </Avatar.Root>
        <span className="text-sm font-medium">
          {review.buyer_name ?? <Trans message="Verified buyer" />}
        </span>
        {review.verified && (
          <Badge variant="positive">
            <BadgeCheckIcon aria-hidden="true" />
            <Trans message="Verified Purchase" />
          </Badge>
        )}
      </div>
    </article>
  );
}
