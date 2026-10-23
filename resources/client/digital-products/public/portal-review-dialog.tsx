import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {message} from '@ui/i18n/message';
import {toast} from '@ui/toast/toast';
import {StarIcon} from 'lucide-react';
import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {useState} from 'react';
import type {PortalOrder} from './portal-order-types';

export function PortalReviewDialog({
  order,
  onClose,
  onSaved,
}: {
  order: PortalOrder;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [stars, setStars] = useState(order.review?.stars ?? 0);
  const [title, setTitle] = useState(order.review?.title ?? '');
  const [review, setReview] = useState(order.review?.review ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<'stars' | 'save' | {api: string}>();
  const {trans} = useTrans();

  const submit = async () => {
    if (!stars) {
      setError('stars');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await fetch('/sanctum/csrf-cookie', {credentials: 'same-origin'});
      const token = document.cookie
        .split('; ')
        .find(value => value.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      await apiClient.post(
        `/api/v1/public/my-portal/purchases/${order.id}/review`,
        {
          stars,
          title: title.trim() || undefined,
          review: review.trim() || undefined,
        },
        {
          headers: {
            ...(token ? {'X-XSRF-TOKEN': decodeURIComponent(token)} : {}),
          },
        },
      );
      await onSaved();
      onClose();
      toast(message('Your review has been saved.'));
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      setError(
        apiMessage !== 'An error occurred.' ? {api: apiMessage} : 'save',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open
      onOpenChange={isOpen => !isOpen && !submitting && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <StarIcon className="text-warning" />
              {order.review ? (
                <Trans message="Edit your review" />
              ) : (
                <Trans message="Write a review" />
              )}
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <div className="flex flex-col gap-4">
              <RadioGroup
                orientation="horizontal"
                value={stars ? String(stars) : null}
                onValueChange={next => setStars(Number(next))}
                aria-label={trans({message: 'Star rating'})}
                aria-invalid={error === 'stars' ? true : undefined}
                disabled={submitting}
                className="w-auto gap-1"
              >
                {[1, 2, 3, 4, 5].map(value => (
                  <RadioGroupItem
                    key={value}
                    value={String(value)}
                    aria-label={trans({
                      message: '[one :value star|other :value stars]',
                      values: {value},
                    })}
                    className="size-9 rounded-button border-0 bg-transparent after:hidden focus-visible:ring-2 data-checked:border-transparent data-checked:bg-transparent [&_[data-slot=radio-group-indicator]]:hidden"
                  >
                    <StarIcon
                      className={
                        value <= stars
                          ? 'fill-current text-warning'
                          : 'text-muted-foreground'
                      }
                    />
                  </RadioGroupItem>
                ))}
              </RadioGroup>
              <Field.Root>
                <Field.Label>
                  <Trans message="Headline (optional)" />
                </Field.Label>
                <Input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
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
                  onChange={event => setReview(event.target.value)}
                  bindToHookForm={false}
                  maxLength={5000}
                />
              </Field.Root>
              {error && (
                <Alert variant="destructive" fillStyle="subtleFill">
                  <Alert.Description>
                    {error === 'stars' && (
                      <Trans message="Choose a star rating to continue." />
                    )}
                    {error === 'save' && (
                      <Trans message="We could not save your review." />
                    )}
                    {typeof error === 'object' ? error.api : null}
                  </Alert.Description>
                </Alert>
              )}
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" disabled={submitting} onClick={onClose}>
              <Trans message="Cancel" />
            </Button>
            <Button disabled={submitting} onClick={() => void submit()}>
              {submitting && <Spinner />}
              <Trans message="Save review" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
