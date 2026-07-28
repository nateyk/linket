import {LinkButton} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {AnimatePresence} from 'framer-motion';
import {CheckIcon, TriangleAlertIcon} from 'lucide-react';
import {ReactNode} from 'react';
import {To} from 'react-router';

export interface BillingRedirectMessageConfig {
  message: ReactNode;
  status: 'success' | 'error';
  link: To;
  buttonLabel: ReactNode;
}

interface BillingRedirectMessageProps {
  config?: BillingRedirectMessageConfig;
}
export function BillingRedirectMessage({config}: BillingRedirectMessageProps) {
  return (
    <AnimatePresence initial={false} mode="wait">
      <div className="mt-20">
        {config ? (
          <div className="flex flex-col items-center gap-6">
            {config.status === 'success' ? (
              <CheckIcon className="size-15 text-positive" />
            ) : (
              <TriangleAlertIcon className="size-15 text-destructive" />
            )}
            <div className="text-2xl font-semibold">{config.message}</div>
            <LinkButton
              variant="default"
              color="primary"
              className="w-full"
              size="lg"
              to={config.link}
            >
              {config.buttonLabel}
            </LinkButton>
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
