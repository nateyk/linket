import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  MailCheckIcon,
  MailIcon,
  PackageOpenIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {AuthLayoutV2} from '@common/auth/ui/auth-layout/auth-layout-v2';
import {PORTAL_EMAIL_KEY} from './portal-order-types';

type RecoveryError = 'email' | 'code' | 'request' | 'expired' | {api: string};

export function RecoveryRequest() {
  const navigate = useNavigate();
  const {trans} = useTrans();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<RecoveryError>();
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
      setSent(true);
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

  return (
    <AuthLayoutV2>
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PackageOpenIcon className="size-5" />
        </div>
        <h1 className="text-3xl font-medium">
          <Trans message="Your purchases" />
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans message="Enter the email used at checkout to receive a 6-digit sign-in code." />
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {sent ? (
          <>
            <Alert fillStyle="subtleFill">
              <MailCheckIcon />
              <Alert.Title>
                <Trans message="Check your inbox" />
              </Alert.Title>
              <Alert.Description>
                <Trans message="Enter the 6-digit code we sent if paid purchases match this email address." />
              </Alert.Description>
            </Alert>
            <Field.Root invalid={error === 'code' ? true : undefined}>
              <Field.Label>
                <Trans message="Sign-in code" />
              </Field.Label>
              <Input
                id="purchase-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={event => {
                  setCode(event.target.value.replace(/\D/g, ''));
                  if (error === 'code') setError(undefined);
                }}
                disabled={submitting}
                bindToHookForm={false}
                aria-invalid={error === 'code' ? true : undefined}
                className="text-center font-mono text-xl tracking-widest tabular-nums"
              />
              {error === 'code' && (
                <Field.Error>
                  <Trans message="Enter the 6-digit code from your email." />
                </Field.Error>
              )}
            </Field.Root>
            <RecoveryProblem error={error} />
            <Button
              className="w-full"
              size="lg"
              disabled={submitting}
              onClick={() => void verifyCode()}
            >
              {submitting ? <Spinner /> : <ShieldCheckIcon />}
              <Trans message="Verify code" />
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled={submitting}
              onClick={() => void requestCode()}
            >
              <Trans message="Resend code" />
            </Button>
          </>
        ) : (
          <>
            <Field.Root invalid={error === 'email' ? true : undefined}>
              <Field.Label>
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
            <Button
              className="w-full"
              size="lg"
              disabled={submitting}
              onClick={() => void requestCode()}
            >
              {submitting ? <Spinner /> : <MailIcon />}
              <Trans message="Email me a sign-in code" />
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Trans message="For your privacy, we show purchase details only after you verify your email code." />
            </p>
          </>
        )}
      </div>
    </AuthLayoutV2>
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

