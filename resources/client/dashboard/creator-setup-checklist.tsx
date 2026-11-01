import {useAuth} from '@common/auth/use-auth';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
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
  nextHint?: string;
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
  const [expanded, setExpanded] = useState(true);
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
      done: query.data.stores.length > 0,
      to: '/dashboard/stores',
    },
    {
      label: 'Add digital product',
      done: query.data.products.length > 0,
      to: '/dashboard/items/new',
    },
    {
      label: 'Upload product file',
      done: query.data.products.some(item => (item.files?.length ?? 0) > 0),
      to: product
        ? `/dashboard/items/${product.id}/edit`
        : '/dashboard/items/new',
    },
    {
      label: 'Configure receiving account',
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
      done: query.data.products.some(
        item => item.status === 'approved' || item.status === 'published',
      ),
      to: product
        ? `/dashboard/items/${product.id}/edit`
        : '/dashboard/items/new',
    },
    {
      label: 'Publish product in storefront',
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
      done: query.data.products.some(item => (item.sales_count ?? 0) > 0),
      to: '/dashboard/items',
      nextHint: 'Share your storefront link to get started',
    },
  ];
  const completed = checks.filter(check => check.done).length;
  const percent = Math.round((completed / checks.length) * 100);
  const nextIndex = checks.findIndex(check => !check.done);
  const isComplete = completed === checks.length;

  if (isComplete && dismissed) {
    return null;
  }

  return (
    <section aria-labelledby="setup-title">
      <Card size="sm" className="gap-0">
        <Card.Header className="pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-primary/10 text-primary">
              <StoreIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Card.Title id="setup-title" className="font-semibold">
                <Trans message="Get your storefront ready to sell" />
              </Card.Title>
              <Card.Description className="mt-0.5">
                <Trans message="Set up your store and start receiving orders." />
              </Card.Description>
            </div>
          </div>
          {isComplete ? (
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
          ) : null}
        </Card.Header>

        <Card.Content className="pb-4">
          <Progress.Root
            value={percent}
            aria-label="Creator setup progress"
            className="gap-y-2"
          >
            <Progress.Label className="text-sm text-muted-foreground">
              <Trans
                message=":completed of :total setup steps complete"
                values={{completed, total: checks.length}}
              />
            </Progress.Label>
            <Progress.Value className="font-semibold tabular-nums" />
            <Progress.Track className="h-1.5">
              <Progress.Indicator />
            </Progress.Track>
          </Progress.Root>
        </Card.Content>

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                color="default"
                className="h-11 w-full justify-between rounded-none border-t px-4"
              >
                <span className="flex items-center gap-2">
                  <Trans message="Setup steps" />
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">
                    {completed}/{checks.length}
                  </span>
                </span>
                <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
              </Button>
            }
          />
          <CollapsibleContent>
            <ol id="setup-steps" className="border-t">
              {checks.map((check, index) => {
                if (index === nextIndex) {
                  return (
                    <li key={check.label}>
                      <NextStepRow step={check} storeUrl={storeUrl} />
                    </li>
                  );
                }

                if (check.done) {
                  return (
                    <li
                      key={check.label}
                      className="flex min-h-11 items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-positive text-primary-foreground">
                        <CheckIcon
                          className="size-3"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                        <Trans message={check.label} />
                      </span>
                      <Badge variant="positive">
                        <Trans message="Complete" />
                      </Badge>
                    </li>
                  );
                }

                return (
                  <li key={check.label} className="border-b last:border-b-0">
                    <Link
                      to={check.to}
                      className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                    >
                      <span className="size-5 shrink-0 rounded-full border border-border bg-background" />
                      <span className="min-w-0 flex-1">
                        <Trans message={check.label} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </section>
  );
}

function NextStepRow({step, storeUrl}: {step: SetupStep; storeUrl: string}) {
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
    <div className="flex flex-col gap-3 border-b bg-primary/4 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 size-5 shrink-0 rounded-full border border-primary bg-background" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              <Trans message={step.label} />
            </span>
            <Badge variant="outline" className="border-primary/30 text-primary">
              <Trans message="Up next" />
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {step.nextHint ? (
              <Trans message={step.nextHint} />
            ) : (
              <Trans message="Continue with this step to finish setup." />
            )}
          </p>
        </div>
      </div>
      {isFirstSale ? (
        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => void onCopy()}
        >
          <Trans message="Copy store link" />
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      ) : (
        <LinkButton to={step.to} size="sm" className="w-full sm:w-auto">
          <Trans message="Continue setup" />
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </LinkButton>
      )}
    </div>
  );
}
