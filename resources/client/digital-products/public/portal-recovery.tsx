import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  MailCheckIcon,
  MailIcon,
  PackageOpenIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';
import {PORTAL_EMAIL_KEY} from './portal-order-types';
import {MyPortalShell} from './my-portal-shell';

const RESEND_SECONDS = 30;

type RecoveryError = 'email' | 'code' | 'request' | 'expired' | {api: string};

export function RecoveryRequest() {
  const navigate = useNavigate();
  const {trans} = useTrans();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<RecoveryError>();

  useEffect(() => {
    if (!sent || seconds === 0) return;
    const timer = window.setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, sent]);

  const requestCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('email');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await apiClient.post('/api/v1/public/my-portal/request-code', {
        email: email.trim(),
      });
      setCode('');
      setSent(true);
      setSeconds(RESEND_SECONDS);
    } catch {
      setError('request');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('code');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await apiClient.post('/api/v1/public/my-portal/verify-code', {
        email: email.trim(),
        code,
      });
      try {
        sessionStorage.setItem(PORTAL_EMAIL_KEY, email.trim());
      } catch {
        // ignore storage failures
      }
      navigate('/my-portal');
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      setError(
        apiMessage !== 'An error occurred.' ? {api: apiMessage} : 'expired',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const changeEmail = () => {
    setSent(false);
    setCode('');
    setSeconds(0);
    setError(undefined);
  };

  return (
    <MyPortalShell>
      <div className="flex min-h-[calc(100dvh-144px)] items-center justify-center py-10 sm:py-14">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card px-5 py-8 shadow-sm sm:px-8">
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {sent ? (
                <MailCheckIcon className="size-6" aria-hidden="true" />
              ) : (
                <PackageOpenIcon className="size-6" aria-hidden="true" />
              )}
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {sent ? (
                  <Trans message="Check your inbox" />
                ) : (
                  <Trans message="Your purchases" />
                )}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {sent ? (
                  <Trans message="If paid purchases match this email address, we sent a 6-digit sign-in code." />
                ) : (
                  <Trans message="Enter the email used at checkout to receive a 6-digit sign-in code." />
                )}
              </p>
            </div>
          </div>

          {sent ? (
            <div className="flex flex-col gap-5">
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <span className="min-w-0 truncate text-sm font-medium" title={email.trim()}>
                  {email.trim()}
                </span>
                <button
                  type="button"
                  onClick={changeEmail}
                  disabled={submitting}
                  className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
                >
                  <Trans message="Change" />
                </button>
              </div>

              <form
                className="flex flex-col gap-4"
                onSubmit={event => {
                  event.preventDefault();
                  void verifyCode();
                }}
              >
                <Field.Root invalid={error === 'code' ? true : undefined}>
                  <Field.Label htmlFor="purchase-code">
                    <Trans message="Sign-in code" />
                  </Field.Label>
                  <PurchaseCodeInput
                    code={code}
                    disabled={submitting}
                    invalid={error === 'code'}
                    onChange={value => {
                      setCode(value);
                      if (error && error !== 'email' && error !== 'request') {
                        setError(undefined);
                      }
                    }}
                    label={trans({message: 'Sign-in code'})}
                  />
                  {error === 'code' && (
                    <Field.Error>
                      <Trans message="Enter the 6-digit code from your email." />
                    </Field.Error>
                  )}
                </Field.Root>

                <RecoveryProblem error={error} />

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={submitting || code.length !== 6}
                >
                  {submitting ? <Spinner /> : <ShieldCheckIcon />}
                  <Trans message="Verify code" />
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground" aria-live="polite">
                {seconds > 0 ? (
                  <>
                    <Trans message="Resend code in" />{' '}
                    <span className="font-medium tabular-nums text-foreground">
                      0:{String(seconds).padStart(2, '0')}
                    </span>
                  </>
                ) : (
                  <>
                    <Trans message="Didn't get the code?" />{' '}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void requestCode()}
                      className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
                    >
                      <Trans message="Resend code" />
                    </button>
                  </>
                )}
              </p>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={event => {
                event.preventDefault();
                void requestCode();
              }}
            >
              <Field.Root invalid={error === 'email' ? true : undefined}>
                <Field.Label htmlFor="purchase-recovery-email">
                  <Trans message="Email address" />
                </Field.Label>
                <Input
                  id="purchase-recovery-email"
                  type="email"
                  autoComplete="email"
                  placeholder={trans({message: 'you@example.com'})}
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    if (error === 'email') setError(undefined);
                  }}
                  disabled={submitting}
                  bindToHookForm={false}
                  aria-invalid={error === 'email' ? true : undefined}
                />
                {error === 'email' && (
                  <Field.Error>
                    <Trans message="Enter a valid email address." />
                  </Field.Error>
                )}
              </Field.Root>
              <RecoveryProblem error={error} />
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <Spinner /> : <MailIcon />}
                <Trans message="Email me a sign-in code" />
              </Button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                <Trans message="For your privacy, we show purchase details only after you verify your email code." />
              </p>
            </form>
          )}
        </section>
      </div>
    </MyPortalShell>
  );
}

function PurchaseCodeInput({
  code,
  disabled,
  invalid,
  label,
  onChange,
}: {
  code: string;
  disabled: boolean;
  invalid: boolean;
  label: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="relative w-full rounded-lg focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground">
      <input
        id="purchase-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={6}
        value={code}
        onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
      />
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({length: 6}, (_, index) => (
          <span
            key={index}
            data-testid="purchase-otp-slot"
            className={cn(
              'flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg border border-input bg-background text-lg font-semibold tabular-nums',
              code.length === index && 'border-primary bg-primary/5',
              invalid && 'border-destructive',
              disabled && 'opacity-60',
            )}
          >
            {code[index] || ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecoveryProblem({error}: {error?: RecoveryError}) {
  if (!error || error === 'email' || error === 'code') return null;

  return (
    <Alert variant="destructive" fillStyle="subtleFill">
      <MailIcon />
      <Alert.Title>
        <Trans message="Unable to continue" />
      </Alert.Title>
      <Alert.Description>
        {error === 'request' && (
          <Trans message="We could not submit your request. Please try again." />
        )}
        {error === 'expired' && (
          <Trans message="That sign-in code is invalid or has expired." />
        )}
        {typeof error === 'object' ? error.api : null}
      </Alert.Description>
    </Alert>
  );
}
