import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Separator} from '@shadcn/separator';
import {apiClient} from '@common/http/query-client';
import {Trans} from '@ui/i18n/trans';
import {BadgeCheckIcon, StarIcon, StarOffIcon} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';
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

const REVIEWS_PER_PAGE = 5;

export function ProductReviewsBlock({
  product,
  biolinkId,
}: {
  product: PublicDigitalProduct;
  biolinkId: number;
}) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<ReviewsResponse['summary']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showAllReviews, setShowAllReviews] = useState(false);

  const baseUrl = `/api/v1/public/biolinks/${biolinkId}/digital-products/${product.id}/reviews`;
  const visibleReviews = showAllReviews
    ? reviews
    : reviews.slice(0, REVIEWS_PER_PAGE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const {data: payload} = await apiClient.get<ReviewsResponse>(baseUrl);
      setReviews(payload.data ?? []);
      setSummary(payload.summary);

    } catch {
      setError('Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void load();
  }, [load]);

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
      <div className="grid items-stretch gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <SummaryCard summary={summary} loading={loading} />
        {reviews.length ? (
          <div className="flex flex-col rounded-card border border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] shadow-xl ring-1 ring-[var(--biolink-border)] backdrop-blur-xl">
            {visibleReviews.map((review, index) => (
              <div key={review.id}>
                {index > 0 && (
                  <Separator className="bg-[var(--biolink-border)]" />
                )}
                <div className="p-5">
                  <ReviewRow review={review} />
                </div>
              </div>
            ))}
            {reviews.length > visibleReviews.length && (
              <>
                <Separator className="bg-[var(--biolink-border)]" />
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
              </>
            )}
          </div>
        ) : (
          !loading && (
            <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-dashed p-6 text-center text-sm text-[var(--biolink-muted-text)]">
              <StarOffIcon className="size-5" />
              <Trans message="No reviews yet." />
            </div>
          )
        )}
      </div>

      {error && (
        <p className="text-center text-sm text-[var(--biolink-muted-text)]">
          {error}
        </p>
      )}

    </section>
  );
}

function SummaryCard({
  summary,
  loading,
}: {
  summary?: ReviewsResponse['summary'];
  loading: boolean;
}) {
  const average = summary?.average ?? 0;
  const counts = summary?.rating_stats?.counts ?? {};
  const percentages = summary?.rating_stats?.percentages ?? {};
  const total = summary?.rating_stats?.total ?? 0;

  return (
    <div className="flex flex-col rounded-card border border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] p-5 text-[var(--biolink-text)] shadow-xl ring-1 ring-[var(--biolink-border)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <p className="text-4xl leading-none font-semibold tracking-tight">
          {loading ? '—' : average.toFixed(1)}
        </p>
        <div className="flex flex-col gap-1">
          <StarRow value={Math.round(average)} />
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
                <StarIcon className="size-3 fill-current text-amber-500" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--biolink-surface)]">
                <div
                  className="h-full rounded-full bg-amber-500"
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
        <p className="text-center text-xs text-[var(--biolink-muted-text)]">
          <Trans message="Verified buyers can leave a review from" />{' '}
          <Link to="/my-order" className="font-medium text-primary underline-offset-4 hover:underline">
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
        <StarRow value={review.stars ?? 0} />
        {review.created_at && (
          <time
            className="shrink-0 text-xs text-[var(--biolink-muted-text)]"
            dateTime={review.created_at}
          >
            {formatDate(review.created_at)}
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

function StarRow({value}: {value: number}) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map(star => (
        <StarIcon
          key={star}
          className={
            star <= value
              ? 'size-4 fill-current text-amber-500'
              : 'size-4 text-[var(--biolink-muted-text)]'
          }
        />
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(
    new Date(value),
  );
}
