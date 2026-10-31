import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';
import {Link} from 'react-router';

const REASONS = [
  {value: 'wrong_reference', label: 'Wrong payment reference'},
  {value: 'duplicate_payment', label: 'Duplicate payment'},
  {value: 'missing_file', label: 'Missing download file'},
] as const;

type Reason = (typeof REASONS)[number]['value'];

export function PortalPaymentDisputeDialog({
  orderId,
  productTitle,
  open,
  onOpenChange,
}: {
  orderId: string;
  productTitle?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<Reason>('wrong_reference');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [createdId, setCreatedId] = useState<string>();

  const submit = async () => {
    if (message.trim().length < 3) {
      setError('Describe what went wrong.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const response = await apiClient.post(
        `/api/v1/public/my-portal/purchases/${orderId}/disputes`,
        {reason, message: message.trim()},
      );
      setCreatedId(response.data.dispute.id);
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) !== 'An error occurred.'
          ? getApiErrorMessage(reason)
          : 'Unable to submit this support request.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="w-[calc(100vw-1.5rem)] sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Report a payment problem" />
            </Dialog.Title>
            <Dialog.Description>
              {productTitle || <Trans message="Your purchase" />}
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body className="flex flex-col gap-4">
            {createdId ? (
              <Alert fillStyle="subtleFill">
                <Alert.Title>
                  <Trans message="Support request submitted" />
                </Alert.Title>
                <Alert.Description>
                  <Trans message="You can track status from My Purchases support requests." />
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link to="/my-portal/tickets" />}
                    >
                      <Trans message="View support requests" />
                    </Button>
                  </div>
                </Alert.Description>
              </Alert>
            ) : (
              <>
                <Field.Root>
                  <Field.Label>
                    <Trans message="What went wrong?" />
                  </Field.Label>
                  <select
                    className="h-10 w-full rounded-button border border-border bg-background px-3 text-sm"
                    value={reason}
                    onChange={event => setReason(event.target.value as Reason)}
                    disabled={busy}
                  >
                    {REASONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field.Root>
                <Field.Root>
                  <Field.Label>
                    <Trans message="Details" />
                  </Field.Label>
                  <Input
                    bindToHookForm={false}
                    value={message}
                    onChange={event => setMessage(event.target.value)}
                    disabled={busy}
                    placeholder="Share the reference, timing, or missing file details."
                  />
                </Field.Root>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  <Trans message="Reporting a problem never bypasses payment verification or issues a refund automatically." />
                </p>
              </>
            )}
          </Dialog.Body>
          <Dialog.Footer className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <Trans message={createdId ? 'Close' : 'Cancel'} />
            </Button>
            {!createdId ? (
              <Button onClick={() => void submit()} disabled={busy}>
                {busy ? <Spinner /> : null}
                <Trans message="Submit request" />
              </Button>
            ) : null}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
