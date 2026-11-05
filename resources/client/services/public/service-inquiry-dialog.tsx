import {apiClient} from '@common/http/query-client';
import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {resolveBiolinkButtonAppearance, resolveBiolinkPublicAppearanceStyle} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Spinner} from '@shadcn/spinner/spinner';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {CheckCircle2Icon, CircleAlertIcon} from 'lucide-react';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {
  buildInquiryPayload,
  emptyInquiryForm,
  validateInquiryForm,
  type InquiryErrors,
  type InquiryFormState,
} from './service-inquiry-form';

export function ServiceInquiryDialog({
  open,
  onOpenChange,
  endpoint,
  packageId,
  packageName,
  appearance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  packageId?: number;
  packageName?: string;
  appearance?: BiolinkAppearanceConfig | null;
}) {
  const {trans} = useTrans();
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // The dialog is portaled outside the page, so it has to carry the store's
  // theme itself; and the conversion moment starts with a focused first field.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);
  const [form, setForm] = useState<InquiryFormState>(() =>
    emptyInquiryForm(packageId),
  );
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string>();

  useEffect(() => {
    if (open) {
      setForm(emptyInquiryForm(packageId));
      setErrors({});
      setSent(false);
      setServerError(undefined);
    }
  }, [open, packageId]);

  const update = (key: keyof InquiryFormState, value: string) => {
    setForm(current => ({...current, [key]: value}));
    setErrors(current => {
      if (!current[key as keyof InquiryErrors]) return current;
      const next = {...current};
      delete next[key as keyof InquiryErrors];
      return next;
    });
  };

  const submit = async () => {
    const nextErrors = validateInquiryForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setServerError(undefined);

    try {
      await apiClient.post(endpoint, buildInquiryPayload(form));
      setSent(true);
    } catch (reason) {
      setServerError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to send inquiry.'}),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content
          className="bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] sm:max-w-md"
          style={resolveBiolinkPublicAppearanceStyle(appearance)}
        >
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Request a quote" />
            </Dialog.Title>
            <Dialog.Description>
              {packageName ? (
                <Trans
                  message="Tell the creator about your project. They will reply with a quote for the :package package."
                  values={{package: packageName}}
                />
              ) : (
                <Trans message="Tell the creator about your project. They will reply with a quote." />
              )}
            </Dialog.Description>
          </Dialog.Header>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2Icon className="size-10 text-positive" />
              <p className="text-base font-medium">
                <Trans message="Inquiry sent" />
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                <Trans message="The creator will contact you soon." />
              </p>
              <Button
                variant="ghost"
                className={cn('w-full', buttonAppearance.className)}
                style={buttonAppearance.style}
                onClick={() => onOpenChange(false)}
              >
                <Trans message="Done" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {serverError && (
                <Alert variant="destructive">
                  <CircleAlertIcon />
                  {serverError}
                </Alert>
              )}

              <InquiryField
                id="inquiry-name"
                label={<Trans message="Name" />}
                error={errors.name}
              >
                <Input
                  ref={nameInputRef}
                  id="inquiry-name"
                  value={form.name}
                  onChange={event => update('name', event.target.value)}
                  aria-invalid={!!errors.name}
                />
              </InquiryField>

              <InquiryField
                id="inquiry-email"
                label={<Trans message="Email" />}
                error={errors.email}
              >
                <Input
                  id="inquiry-email"
                  type="email"
                  value={form.email}
                  onChange={event => update('email', event.target.value)}
                  aria-invalid={!!errors.email}
                />
              </InquiryField>

              <InquiryField
                id="inquiry-phone"
                label={<Trans message="Phone" />}
                optional
              >
                <Input
                  id="inquiry-phone"
                  type="tel"
                  value={form.phone}
                  onChange={event => update('phone', event.target.value)}
                />
              </InquiryField>

              <InquiryField
                id="inquiry-message"
                label={<Trans message="Message" />}
                error={errors.message}
              >
                <Textarea
                  id="inquiry-message"
                  rows={5}
                  value={form.message}
                  onChange={event => update('message', event.target.value)}
                  aria-invalid={!!errors.message}
                  placeholder={trans(
                    message(
                      'I need a logo for my business. Here is what I have in mind...',
                    ),
                  )}
                />
              </InquiryField>

              <Button
                variant="ghost"
                className={cn('w-full', buttonAppearance.className)}
                style={buttonAppearance.style}
                size="lg"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting && <Spinner />}
                <Trans message="Send inquiry" />
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InquiryField({
  id,
  label,
  error,
  optional = false,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: 'required' | 'invalid';
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && (
          <span className="ms-1 text-xs font-normal text-muted-foreground">
            <Trans message="(optional)" />
          </span>
        )}
      </label>
      {children}
      {error === 'required' && (
        <p className="text-sm text-destructive">
          <Trans message="This field is required." />
        </p>
      )}
      {error === 'invalid' && (
        <p className="text-sm text-destructive">
          <Trans message="Enter a valid email address." />
        </p>
      )}
    </div>
  );
}
