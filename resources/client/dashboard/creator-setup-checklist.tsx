import {apiClient} from '@common/http/query-client';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {ArrowRightIcon, CheckIcon, ChevronDownIcon} from 'lucide-react';
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
type ReceivingAccount = {account_configured?: boolean; account_ready?: boolean; checkout_eligible?: boolean};
type ChecklistData = {stores: Store[]; products: Product[]; accounts: ReceivingAccount[]};
type SetupStep = {
  label: string;
  done: boolean;
  to: string;
  nextHint?: string;
};

const unwrap = <T,>(response: {data: {data?: {data?: T[]} | T[]}}): T[] => {
  const result = response.data.data;
  if (Array.isArray(result)) return result;
  return result?.data ?? [];
};

export function CreatorSetupChecklist() {
  const [expanded, setExpanded] = useState(true);
  const query = useQuery({
    queryKey: ['creator-setup-checklist'],
    refetchOnMount: 'always',
    refetchInterval: 30000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ChecklistData> => {
      const [stores, products, accounts] = await Promise.all([
        apiClient.get('/api/v1/stores', {params: {per_page: 100}}),
        apiClient.get('/api/v1/storefront/products', {params: {per_page: 100}}),
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
      <section
        aria-labelledby="setup-title"
        className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="setup-title" className="text-base font-semibold tracking-tight">
            <Trans message="Get your storefront ready to sell" />
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans message="Loading setup progress…" />
          </p>
        </div>
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-3/5" />
      </section>
    );
  }
  if (query.isError || !query.data) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 text-sm text-destructive shadow-sm sm:p-6">
        <Trans message="Creator setup progress could not be loaded." />
      </section>
    );
  }

  const product = query.data.products[0];
  const storeUrl = query.data.stores[0]?.short_url ?? '';
  const checks: SetupStep[] = [
    {label: 'Create storefront', done: query.data.stores.length > 0, to: '/dashboard/stores'},
    {label: 'Add digital product', done: query.data.products.length > 0, to: '/dashboard/items/new'},
    {
      label: 'Upload product file',
      done: query.data.products.some(item => (item.files?.length ?? 0) > 0),
      to: product ? `/dashboard/items/${product.id}/edit` : '/dashboard/items/new',
    },
    {
      label: 'Configure receiving account',
      done: query.data.accounts.some(account => (account.account_configured ?? account.account_ready ?? account.checkout_eligible) === true),
      to: '/account-settings/receiving-accounts',
    },
    {
      label: 'Get product approved',
      done: query.data.products.some(item => item.status === 'approved' || item.status === 'published'),
      to: product ? `/dashboard/items/${product.id}/edit` : '/dashboard/items/new',
    },
    {
      label: 'Publish product in storefront',
      done: query.data.products.some(
        item =>
          (item.status === 'approved' || item.status === 'published') &&
          (item.biolink_ids?.length ?? 0) > 0 &&
          (!item.is_course || Boolean(item.course?.published_at)),
      ),
      to: product ? `/dashboard/items/${product.id}/edit` : '/dashboard/items/new',
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

  return (
    <section
      aria-labelledby="setup-title"
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="setup-title" className="text-base font-semibold tracking-tight">
            <Trans message="Get your storefront ready to sell" />
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans message=":completed of 7 setup steps complete" values={{completed}} />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{percent}%</span>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="setup-steps"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={() => setExpanded(value => !value)}
          >
            <ChevronDownIcon
              className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
              aria-hidden="true"
            />
            <span className="sr-only">
              {expanded ? (
                <Trans message="Hide setup steps" />
              ) : (
                <Trans message="Show setup steps" />
              )}
            </span>
          </button>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Creator setup progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        className="flex gap-1"
      >
        {checks.map((check, index) => (
          <span
            key={check.label}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-500',
              index < completed ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>

      {expanded ? (
        <ol id="setup-steps" className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {checks.map((check, index) => {
            if (index === nextIndex) {
              return (
                <li key={check.label} className="sm:col-span-2">
                  <NextStepCard step={check} storeUrl={storeUrl} />
                </li>
              );
            }

            return (
              <li key={check.label}>
                {check.done ? (
                  <button
                    type="button"
                    aria-pressed="true"
                    className="group flex w-full items-center gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-secondary/60"
                    onClick={() => {
                      window.location.assign(check.to);
                    }}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors">
                      <CheckIcon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                      <Trans message={check.label} />
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      <Trans message="Complete" />
                    </span>
                  </button>
                ) : (
                  <Link
                    to={check.to}
                    className="group flex w-full items-center gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-secondary/60"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      <Trans message={check.label} />
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}

      <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        <Trans message="Free and Pro plan limits are enforced when you create storefronts and products." />
      </p>
    </section>
  );
}

function NextStepCard({step, storeUrl}: {step: SetupStep; storeUrl: string}) {
  const isFirstSale = step.label === 'Make your first sale';
  const [, copyToClipboard] = useClipboard(storeUrl);

  const onCopy = async () => {
    if (!storeUrl) {
      toast.warning(<Trans message="Create a storefront first to copy its link." />);
      return;
    }
    await copyToClipboard();
    toast.success(<Trans message="Store link copied" />);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary" />
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              <Trans message={step.label} />
            </span>
            <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Trans message="Up next" />
            </span>
          </div>
          <span className="text-sm leading-relaxed text-muted-foreground">
            {step.nextHint ? (
              <Trans message={step.nextHint} />
            ) : (
              <Trans message="Continue with this step to finish setup." />
            )}
          </span>
        </div>
      </div>
      {isFirstSale ? (
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Trans message="Copy store link" />
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <Link
          to={step.to}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Trans message="Continue setup" />
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
