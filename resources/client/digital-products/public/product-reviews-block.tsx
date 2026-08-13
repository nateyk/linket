import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {StarIcon, StarOffIcon} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import type {PublicDigitalProduct} from './digital-product-public-pages';

type PublicReview = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
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

function reviewCookieName(productId: number) {
  return `digital_product_reviewed_${productId}`;
}

function getReviewCookie(productId: number): string | undefined {
  return document.cookie
    .split('; ')
    .find(value => value.startsWith(`${reviewCookieName(productId)}=`))
    ?.split('=')[1];
}

function setReviewCookie(productId: number, orderUuid: string) {
  document.cookie = `${reviewCookieName(productId)}=${orderUuid}; path=/; max-age=31536000; samesite=lax`;
}

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ownReview, setOwnReview] = useState<PublicReview>();
  const [ownOrderUuid, setOwnOrderUuid] = useState<string>();

  const baseUrl = `/api/v1/public/biolinks/${biolinkId}/digital-products/${product.id}/reviews`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(baseUrl, {
        credentials: 'same-origin',
        headers: {Accept: 'application/json'},
      });
      if (!response.ok) throw new Error('Unable to load reviews.');
      const payload: ReviewsResponse = await response.json();
      setReviews(payload.data ?? []);
      setSummary(payload.summary);

      const orderUuid = getReviewCookie(product.id);
      setOwnOrderUuid(orderUuid);
      if (orderUuid) {
        const ownResponse = await fetch(`${baseUrl}/${orderUuid}`, {
          credentials: 'same-origin',
          headers: {Accept: 'application/json'},
        });
        if (ownResponse.ok) {
          const ownPayload = await ownResponse.json();
          const found = ownPayload?.data;
          if (found) setOwnReview(found);
        }
      }
    } catch {
      setError('Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, product.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    setDialogOpen(true);
  };

  return (
    <section
      className="flex w-full flex-col gap-4"
      aria-labelledby="product-reviews-heading"
    >
      <div className="grid items-stretch gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <SummaryCard
          summary={summary}
          onWrite={openDialog}
          canWrite={!ownReview}
          loading={loading}
        />
        {reviews.length ? (
          <div className="flex flex-col gap-3">
            {reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-dashed p-6 text-center text-sm text-[var(--biolink-muted-text)]">
              <StarOffIcon className="size-5" />
              <Trans message="No reviews yet. Be the first to review this product." />
            </div>
          )
        )}
      </div>

      {error && (
        <p className="text-center text-sm text-[var(--biolink-muted-text)]">
          {error}
        </p>
      )}

      {dialogOpen && (
        <ReviewDialog
          productId={product.id}
          baseUrl={baseUrl}
          existing={ownReview}
          orderUuid={ownOrderUuid}
          onClose={() => setDialogOpen(false)}
          onSaved={review => {
            setOwnReview(review);
            setReviews(current =>
              current.some(item => item.id === review.id)
                ? current.map(item => (item.id === review.id ? review : item))
                : [review, ...current],
            );
            setDialogOpen(false);
            void load();
          }}
        />
      )}
    </section>
  );
}

function SummaryCard({
  summary,
  onWrite,
  canWrite,
  loading,
}: {
  summary?: ReviewsResponse['summary'];
  onWrite: () => void;
  canWrite: boolean;
  loading: boolean;
}) {
  const average = summary?.average ?? 0;
  const counts = summary?.rating_stats?.counts ?? {};
  const percentages = summary?.rating_stats?.percentages ?? {};
  const total = summary?.rating_stats?.total ?? 0;

  return (
    <div className="flex flex-col justify-between gap-4 rounded-card border border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] p-5 text-[var(--biolink-text)]">
      <div className="flex items-center gap-3">
        <p className="text-4xl font-semibold tracking-tight">
          {loading ? '—' : average.toFixed(1)}
        </p>
        <div className="flex flex-col gap-1">
          <StarRow value={Math.round(average)} />
          <p className="text-xs text-[var(--biolink-muted-text)]">
            <Trans message=":count reviews" values={{count: total}} />
          </p>
        </div>
      </div>

      {!loading && (
        <div className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="flex w-6 items-center justify-end gap-0.5 text-[var(--biolink-muted-text)]">
                {star}
                <StarIcon className="size-3 fill-current" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--biolink-surface)]">
                <div
                  className="h-full rounded-full bg-[var(--biolink-text)]"
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

      {canWrite && (
        <Button
          variant="outline"
          className="w-full bg-[var(--biolink-surface)] text-[var(--biolink-text)] ring-[var(--biolink-border)]"
          onClick={onWrite}
          disabled={loading}
        >
          <StarIcon className="size-4" />
          <Trans message="Write a review" />
        </Button>
      )}
      {!canWrite && (
        <p className="text-center text-xs text-[var(--biolink-muted-text)]">
          <Trans message="You reviewed this product" />
        </p>
      )}
    </div>
  );
}

function ReviewCard({review}: {review: PublicReview}) {
  return (
    <article className="flex flex-col gap-2 rounded-card border border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] p-5 text-[var(--biolink-text)]">
      <div className="flex items-center justify-between gap-3">
        <StarRow value={review.stars ?? 0} />
        <span className="shrink-0 text-xs text-[var(--biolink-muted-text)]">
          {review.buyer_name ?? <Trans message="Verified buyer" />}
        </span>
      </div>
      {review.title && <h3 className="text-sm font-semibold">{review.title}</h3>}
      {review.review && (
        <p className="text-sm leading-6 whitespace-pre-line text-[var(--biolink-muted-text)]">
          {review.review}
        </p>
      )}
      {review.created_at && (
        <time
          className="text-xs text-[var(--biolink-muted-text)]"
          dateTime={review.created_at}
        >
          {formatDate(review.created_at)}
        </time>
      )}
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
              ? 'size-4 fill-current'
              : 'size-4 text-[var(--biolink-muted-text)]'
          }
        />
      ))}
    </div>
  );
}

function ReviewDialog({
  productId,
  baseUrl,
  existing,
  orderUuid,
  onClose,
  onSaved,
}: {
  productId: number;
  baseUrl: string;
  existing?: PublicReview;
  orderUuid?: string;
  onClose: () => void;
  onSaved: (review: PublicReview) => void;
}) {
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [review, setReview] = useState(existing?.review ?? '');
  const [orderId, setOrderId] = useState(orderUuid ?? '');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const verified = Boolean(orderUuid);

  const submit = async () => {
    if (stars < 1) {
      setError('Choose a star rating to continue.');
      return;
    }
    if (!verified) {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError('Enter a valid email address.');
        return;
      }
      if (orderId.trim().length < 4) {
        setError('Enter the order reference from your receipt.');
        return;
      }
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_uuid: orderId.trim(),
          buyer_email: email.trim(),
          stars,
          title: title.trim() || undefined,
          review: review.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => undefined);
        throw new Error(payload?.message ?? 'We could not save your review.');
      }
      const payload = await response.json();
      onSaved(payload?.data);
      setReviewCookie(productId, orderId.trim());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'We could not save your review.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={open => !open && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <StarIcon />
              {existing ? (
                <Trans message="Edit your review" />
              ) : (
                <Trans message="Write a review" />
              )}
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Your review appears right away. It helps other buyers choose with confidence." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <div className="space-y-4 px-0.5 py-1">
              {!verified && (
                <p className="rounded-input bg-muted p-3 text-xs text-muted-foreground">
                  <Trans message="To review this product, verify your purchase with the order reference and email from your receipt." />
                </p>
              )}
              <StarPicker value={stars} onChange={setStars} />
              <Field.Root>
                <Field.Label>
                  <Trans message="Headline (optional)" />
                </Field.Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  bindToHookForm={false}
                  maxLength={120}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>
                  <Trans message="Review (optional)" />
                </Field.Label>
                <Textarea
                  rows={4}
                  value={review}
                  onChange={e => setReview(e.target.value)}
                  bindToHookForm={false}
                />
              </Field.Root>
              {!verified && (
                <>
                  <Field.Root>
                    <Field.Label>
                      <Trans message="Order reference" />
                    </Field.Label>
                    <Input
                      value={orderId}
                      onChange={e => setOrderId(e.target.value)}
                      bindToHookForm={false}
                      placeholder="e.g. 9f0c..."
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      <Trans message="Email used at checkout" />
                    </Field.Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      bindToHookForm={false}
                    />
                  </Field.Root>
                </>
              )}
              {error && (
                <p className="rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              <Trans message="Cancel" />
            </Button>
            <Button disabled={submitting} onClick={() => void submit()}>
              {submitting ? <Spinner /> : <StarIcon />}
              <Trans message="Submit review" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="rounded-full p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => onChange(star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <StarIcon
            className={
              star <= value
                ? 'size-6 fill-current text-amber-500'
                : 'size-6 text-muted'
            }
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(
    new Date(value),
  );
}