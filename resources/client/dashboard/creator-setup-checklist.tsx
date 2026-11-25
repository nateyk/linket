import {useAuth} from '@common/auth/use-auth';
import {apiClient} from '@common/http/query-client';
import {Button, LinkButton} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {Progress} from '@shadcn/progress/progress';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {useLocalStorage} from '@ui/utils/hooks/local-storage';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  StoreIcon,
  XIcon,
} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

type Store = {id: number; short_url?: string | null; back_half?: string | null};
type Product = {
  id: number;
  status: string;
  is_course?: boolean;
  course?: {published_at?: string | null} | null;
  files?: Array<{id: number}>;
  biolink_ids?: number[];
  sales_count?: number;
};
type ReceivingAccount = {
  account_configured?: boolean;
  account_ready?: boolean;
  checkout_eligible?: boolean;
};
type ChecklistData = {
  stores: Store[];
  products: Product[];
  accounts: ReceivingAccount[];
};
type SetupStep = {
  label: string;
  done: boolean;
  to: string;
  nextHint: string;
  actionLabel: string;
};

const unwrap = <T,>(response: {
  data: {data?: {data?: T[]} | T[]};
}): T[] => {
  const result = response.data.data;
  if (Array.isArray(result)) return result;
  return result?.data ?? [];
};

export function CreatorSetupChecklist() {
  const {user} = useAuth();
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const dismissalKey = `creator-setup-checklist-dismissed-v1:${user?.id ?? 'unknown'}`;
  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    dismissalKey,
    false,
  );
  const query = useQuery({
    queryKey: ['creator-setup-checklist'],
    refetchOnMount: 'always',
    refetchInterval: 30000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ChecklistData> => {
      const [stores, products, accounts] = await Promise.all([
        apiClient.get('/api/v1/stores', {params: {per_page: 100}}),
        apiClient.get('/api/v1/storefront/products', {
          params: {per_page: 100},
        }),
        apiClient.get('/api/v1/storefront/payment-methods'),
      ]);
      return {
        stores: unwrap<Store>(stores),
        products: unwrap<Product>(products),
        accounts: unwrap<ReceivingAccount>(accounts),
      };
    },
  });

  if (query.isPending && !query.data) {
    return (
      <section aria-labelledby="setup-title">
        <Card size="sm">
          <Card.Header>
            <Card.Title id="setup-title">
              <Trans message="Get your storefront ready to sell" />
            </Card.Title>
            <Card.Description>
              <Trans message="Loading setup progress…" />
            </Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card.Content>
        </Card>
      </section>
    );
  }

  if (query.isError || !query.data) {
    return (
      <section aria-labelledby="setup-error-title">
        <Card size="sm">
          <Card.Header>
            <Card.Title id="setup-error-title">
              <Trans message="Storefront setup" />
            </Card.Title>
            <Card.Description className="text-destructive">
              <Trans message="Creator setup progress could not be loaded." />
            </Card.Description>
          </Card.Header>
        </Card>
      </section>
    );
  }

  const product = query.data.products[0];
  const storeUrl = query.data.stores[0]?.short_url ?? '';
  const checks: SetupStep[] = [
    {
      label: 'Create storefront',
      nextHint: 'Give your products a home and choose your storefront link.',
      actionLabel: 'Create storefront',
      done: query.data.stores.length > 0,
      to: '/dashboard/stores',
    },
    {
      label: 'Add digital product',
      nextHint: 'Add your first digital item with a title and price.',
      actionLabel: 'Add product',
      done: query.data.products.length > 0,
      to: '/dashboard/items/new',
    },
    {
      label: 'Upload product file',
      nextHint: 'Attach the file your customers will receive.',
      actionLabel: 'Upload file',
      done: query.data.products.some(item => (item.files?.length ?? 0) > 0),
      to: product
        ? `/dashboard/items/${product.id}/edit`
        : '/dashboard/items/new',
    },
    {
      label: 'Configure payout account',
      nextHint: 'Add your payout details so you can request withdrawals.',
      actionLabel: 'Add payout account',
      done: query.data.accounts.some(
        account =>
          (account.account_configured ??
            account.account_ready ??
            account.checkout_eligible) === true,
      ),
      to: '/account-settings/receiving-accounts',
    },
    {
      label: 'Get product approved',
      nextHint: 'Open your product to review its approval status and submit any required changes.',
      actionLabel: 'Review product',
      done: query.data.products.some(
        item => item.status === 'approved' || item.status === 'published',
      ),
      to: product
        ? `/dashboard/items/${product.id}/edit`
        : '/dashboard/items/new',
    },
    {
      label: 'Publish product in storefront',
      nextHint: 'Add your approved product to your storefront.',
      actionLabel: 'Publish product',
      done: query.data.products.some(
        item =>
          (item.status === 'approved' || item.status === 'published') &&
          (item.biolink_ids?.length ?? 0) > 0 &&
          (!item.is_course || Boolean(item.course?.published_at)),
      ),
      to: product
        ? `/dashboard/items/${product.id}/edit`
        : '/dashboard/items/new',
    },
    {
      label: 'Make your first sale',
      nextHint: 'Share your storefront link to get started',
      actionLabel: 'Copy store link',
      done: query.data.products.some(item => (item.sales_count ?? 0) > 0),
      to: '/dashboard/items',
    },
  ];
  const completed = checks.filter(check => check.done).length;
  const percent = Math.round((completed / checks.length) * 100);
  const nextIndex = checks.findIndex(check => !check.done);
  const isComplete = completed === checks.length;

  if (isComplete && dismissed) {
    return null;
  }

  const open = expanded ?? !isComplete;

  return (
    <section aria-labelledby="setup-title">
      <Card size="sm" className="data-[size=sm]:gap-3">
        <Card.Header>
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-card-xs',
                isComplete
                  ? 'bg-positive/10 text-positive'
                  : 'bg-primary/10 text-primary',
              )}
            >
              {isComplete ? (
                <CheckIcon className="size-5" aria-hidden="true" />
              ) : (
                <StoreIcon className="size-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <Card.Title id="setup-title" role="heading" aria-level={2}>
                {isComplete ? (
                  <Trans message="Storefront setup complete" />
                ) : (
                  <Trans message="Get your storefront ready to sell" />
                )}
              </Card.Title>
              <Card.Description className="mt-1">
                {isComplete ? (
                  <Trans message="You've completed every step, including your first sale." />
                ) : (
                  <Trans message="Follow the steps to launch your store and make your first sale." />
                )}
              </Card.Description>
            </div>
          </div>
          {isComplete && (
            <Card.Action>
              <Button
                type="button"
                variant="ghost"
                color="default"
                size="icon-sm"
                aria-label="Remove setup checklist from dashboard"
                onClick={() => setDismissed(true)}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </Card.Action>
          )}
        </Card.Header>

        <Card.Content>
          <Progress.Root value={percent}>
            <Progress.Label className="text-sm text-muted-foreground">
              <Trans
                message=":completed of :total setup steps complete"
                values={{completed, total: checks.length}}
              />
            </Progress.Label>
            <Progress.Value className="font-medium tabular-nums" />
            <Progress.Track className="h-1.5">
              <Progress.Indicator
                className={cn(
                  'motion-reduce:transition-none',
                  isComplete && 'bg-positive',
                )}
              />
            </Progress.Track>
          </Progress.Root>
        </Card.Content>

        <Collapsible open={open} onOpenChange={setExpanded}>
          <Card.Content>
            <CollapsibleTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="default"
                  className="group h-10 w-full justify-between px-3"
                >
                  <span>
                    {open ? (
                      <Trans message="Hide setup steps" />
                    ) : (
                      <Trans message="View setup steps" />
                    )}
                  </span>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className={cn(
                      'transition-transform motion-reduce:transition-none',
                      open && 'rotate-180',
                    )}
                  />
                </Button>
              }
            />
            {!open && !isComplete && nextIndex >= 0 && (
              <div className="mt-2" aria-current="step">
                <NextStepRow
                  step={checks[nextIndex]}
                  index={nextIndex}
                  storeUrl={storeUrl}
                />
              </div>
            )}
            <CollapsibleContent
              inert={!open}
              aria-hidden={!open}
              className="motion-reduce:transition-none"
            >
              <ol id="setup-steps" className="space-y-1 pt-2">
                {checks.map((step, index) => (
                  <li key={step.label} aria-current={index === nextIndex ? 'step' : undefined}>
                    {index === nextIndex ? (
                      <NextStepRow step={step} index={index} storeUrl={storeUrl} />
                    ) : step.done ? (
                      <div className="flex min-h-10 items-center gap-3 px-3 py-2">
                        <StepIndicator index={index} done />
                        <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                          <Trans message={step.label} />
                        </span>
                        <span className="sr-only">
                          <Trans message="Complete" />
                        </span>
                      </div>
                    ) : (
                      <Link
                        to={step.to}
                        className="flex min-h-10 items-center gap-3 rounded-card-xs px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary motion-reduce:transition-none"
                      >
                        <StepIndicator index={index} />
                        <span className="min-w-0 flex-1">
                          <Trans message={step.label} />
                        </span>
                        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </CollapsibleContent>
          </Card.Content>
        </Collapsible>
      </Card>
    </section>
  );
}

function StepIndicator({
  index,
  done = false,
  active = false,
}: {
  index: number;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
        done
          ? 'border-transparent bg-positive/10 text-positive'
          : active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-muted-foreground',
      )}
    >
      {done ? <CheckIcon className="size-4" /> : index + 1}
    </span>
  );
}

function NextStepRow({
  step,
  index,
  storeUrl,
}: {
  step: SetupStep;
  index: number;
  storeUrl: string;
}) {
  const isFirstSale = step.label === 'Make your first sale';
  const [, copyToClipboard] = useClipboard(storeUrl);

  const onCopy = async () => {
    if (!storeUrl) {
      toast.warning(
        <Trans message="Create a storefront first to copy its link." />,
      );
      return;
    }
    await copyToClipboard();
    toast.success(<Trans message="Store link copied" />);
  };

  return (
    <div className="flex min-w-0 items-start gap-3 rounded-card-xs border border-primary/30 bg-primary/4 p-3">
      <StepIndicator index={index} active />
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary">
            <Trans message="Up next" />
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            <Trans message={step.label} />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans message={step.nextHint} />
          </p>
        </div>
        {isFirstSale && storeUrl ? (
          <Button
            type="button"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => void onCopy()}
          >
            <Trans message={step.actionLabel} />
          </Button>
        ) : (
          <LinkButton to={isFirstSale ? '/dashboard/stores' : step.to} size="sm" className="w-full shrink-0 sm:w-auto">
            <Trans message={isFirstSale ? 'View storefront' : step.actionLabel} />
            <ArrowRightIcon data-icon="inline-end" className="rtl:rotate-180" aria-hidden="true" />
          </LinkButton>
        )}
      </div>
    </div>
  );
}
