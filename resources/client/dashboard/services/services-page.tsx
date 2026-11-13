import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {
  BriefcaseBusinessIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  InboxIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  StoreIcon,
  Trash2Icon,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router';
import {CreatorListingToolbar} from '@app/dashboard/creator-listing-toolbar';

type ServiceStatus = 'draft' | 'published';

type ServiceStore = {
  id: number;
  name: string;
  short_url: string;
};

type CreatorService = {
  id: number;
  title: string;
  slug: string;
  status: ServiceStatus;
  category?: string | null;
  short_description?: string | null;
  cover?: {url: string} | null;
  packages?: unknown[];
  starting_price_cents?: number | null;
  currency: string;
  inquiries_count: number;
  new_inquiries_count: number;
  store?: ServiceStore | null;
  public_url: string;
};

type ServicesResponse = {
  data?: CreatorService[];
};

export function Component() {
  const {trans} = useTrans();
  const [services, setServices] = useState<CreatorService[]>([]);
  const [storesCount, setStoresCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busyId, setBusyId] = useState<number>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('default');
  const publishedCount = services.filter(
    service => service.status === 'published',
  ).length;

  // Services are already loaded for this workspace. Filtering here avoids
  // extra API requests and never mutates the original server response order.
  const visibleServices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = services.filter(service => {
      if (status && service.status !== status) return false;
      if (!query) return true;
      return [
        service.title,
        service.category,
        service.short_description,
        service.store?.name,
      ].some(value => value?.toLocaleLowerCase().includes(query));
    });
    if (sort === 'title') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sort === '-inquiries') {
      return [...filtered].sort((a, b) =>
        b.inquiries_count - a.inquiries_count || a.title.localeCompare(b.title),
      );
    }
    return filtered;
  }, [services, search, status, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const [servicesResponse, storesResponse] = await Promise.all([
        apiClient.get('/api/v1/services?per_page=100'),
        apiClient.get('/api/v1/stores?per_page=1'),
      ]);

      setServices((servicesResponse.data as ServicesResponse).data ?? []);
      setStoresCount(
        ((storesResponse.data as {data?: unknown[]}).data ?? []).length,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to load services.'}),
      );
    } finally {
      setLoading(false);
    }
  }, [trans]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (
    service: CreatorService,
    status: ServiceStatus,
  ) => {
    if (!service.store) return;
    setBusyId(service.id);
    setError(undefined);

    try {
      await apiClient.put(`/api/v1/services/${service.id}`, {
        store_id: service.store.id,
        title: service.title,
        status,
      });
      toast.positive(
        status === 'published'
          ? message('Service published')
          : message('Service moved to drafts'),
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to update service.'}),
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const remove = async (service: CreatorService): Promise<boolean> => {
    setBusyId(service.id);
    setError(undefined);

    try {
      await apiClient.delete(`/api/v1/services/${service.id}`);
      setServices(current => current.filter(item => item.id !== service.id));
      toast.positive(message('Service deleted'));
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to delete service.'}),
      );
      return false;
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle render={<h1 />}>
          <Trans message="My Services" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          size="sm"
          render={<Link to="/dashboard/services/inquiries" />}
        >
          <InboxIcon className="size-4" />
          <span className="max-sm:hidden">
            <Trans message="Inquiries" />
          </span>
        </Button>
        <Button
          size="sm"
          render={<Link to="/dashboard/services/new" />}
        >
          <PlusIcon className="size-4" />
          <span className="max-sm:hidden">
            <Trans message="New service" />
          </span>
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
          {error && <ErrorNotice message={error} onRetry={() => void load()} />}

          {loading ? (
            <ServiceSkeleton />
          ) : storesCount === 0 ? (
            <Empty.Root className="rounded-card border border-dashed py-20">
              <Empty.Header>
                <Empty.Media variant="icon">
                  <StoreIcon />
                </Empty.Media>
                <Empty.Title>
                  <Trans message="Create a storefront first" />
                </Empty.Title>
                <Empty.Description>
                  <Trans message="Services live on your storefront. Create one before adding your first service." />
                </Empty.Description>
              </Empty.Header>
              <Empty.Content>
                <Button render={<Link to="/dashboard/stores" />}>
                  <Trans message="Go to My Store" />
                </Button>
              </Empty.Content>
            </Empty.Root>
          ) : services.length ? (
            <div className="flex flex-col gap-4">
              <CreatorListingToolbar
                search={search}
                searchLabel={trans({message: 'Search services'})}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
                statusOptions={[
                  {value: 'published', label: <Trans message="Published" />},
                  {value: 'draft', label: <Trans message="Draft" />},
                ]}
                sort={sort}
                defaultSort="default"
                onSortChange={setSort}
                sortOptions={[
                  {value: 'default', label: <Trans message="Default order" />},
                  {value: 'title', label: <Trans message="Title" />},
                  {value: '-inquiries', label: <Trans message="Most inquiries" />},
                ]}
                onClear={() => {
                  setSearch('');
                  setStatus('');
                  setSort('default');
                }}
                summary={
                  <Trans
                    message=":published published · :drafts drafts · :inquiries inquiries"
                    values={{
                      published: publishedCount,
                      drafts: services.length - publishedCount,
                      inquiries: services.reduce(
                        (total, service) => total + service.inquiries_count,
                        0,
                      ),
                    }}
                  />
                }
              />
              {visibleServices.length ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleServices.map(service => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      busy={busyId === service.id}
                      onToggleStatus={() =>
                        void changeStatus(
                          service,
                          service.status === 'published' ? 'draft' : 'published',
                        )
                      }
                      onDelete={() => remove(service)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-card-sm border border-dashed p-6 text-center" role="status">
                  <p className="text-sm font-medium"><Trans message="No matching services" /></p>
                  <Button type="button" variant="outline" color="default" size="sm" onClick={() => {
                    setSearch('');
                    setStatus('');
                    setSort('default');
                  }}>
                    <Trans message="Clear filters" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Empty.Root className="rounded-card border border-dashed py-20">
              <Empty.Header>
                <Empty.Media variant="icon">
                  <BriefcaseBusinessIcon />
                </Empty.Media>
                <Empty.Title>
                  <Trans message="Create your first service" />
                </Empty.Title>
                <Empty.Description>
                  <Trans message="Showcase what you do, add packages and let customers request a quote." />
                </Empty.Description>
              </Empty.Header>
              <Empty.Content>
                <Button render={<Link to="/dashboard/services/new" />}>
                  <PlusIcon data-icon="inline-start" />
                  <Trans message="Create service" />
                </Button>
              </Empty.Content>
            </Empty.Root>
          )}
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function ErrorNotice({
  message: errorMessage,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <CircleAlertIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{errorMessage}</span>
      <Button size="sm" variant="outline" color="danger" onClick={onRetry}>
        <Trans message="Retry" />
      </Button>
    </div>
  );
}

function ServiceCard({
  service,
  busy,
  onToggleStatus,
  onDelete,
}: {
  service: CreatorService;
  busy: boolean;
  onToggleStatus: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const {trans} = useTrans();
  const editPath = `/dashboard/services/${service.id}/edit`;

  return (
    <Card.Root className="group flex h-full flex-col gap-0 overflow-hidden py-0 ring-1 ring-foreground/10 transition-shadow hover:shadow-sm">
      <Card.Header className="relative block p-0">
        <Link
          to={editPath}
          className="block aspect-video overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {service.cover?.url ? (
            <img
              className="size-full object-cover"
              src={service.cover.url}
              loading="lazy"
              decoding="async"
              alt={trans({
                message: ':title service cover',
                values: {title: service.title},
              })}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
              <BriefcaseBusinessIcon className="size-8 opacity-65" />
            </div>
          )}
        </Link>
        <div className="absolute top-3 left-3">
          <Badge
            variant={service.status === 'published' ? 'default' : 'secondary'}
          >
            {service.status === 'published' ? (
              <Trans message="Published" />
            ) : (
              <Trans message="Draft" />
            )}
          </Badge>
        </div>
      </Card.Header>

      <Card.Content className="flex flex-1 flex-col gap-3 p-4 pb-0">
        <div className="flex min-w-0 flex-col gap-1">
          {service.category && (
            <span className="truncate text-xs font-medium text-muted-foreground">
              {service.category}
            </span>
          )}
          <Card.Title className="truncate text-sm leading-5 font-semibold">
            <Link
              to={editPath}
              className="hover:underline hover:underline-offset-3"
            >
              {service.title}
            </Link>
          </Card.Title>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {service.starting_price_cents != null ? (
              <span className="inline-flex items-center gap-1">
                <Trans message="From" />
                <FormattedCurrency
                  valueInCents={service.starting_price_cents}
                  currency={service.currency.toUpperCase()}
                />
              </span>
            ) : (
              <Trans message="Request a quote" />
            )}
          </span>
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span>
            <Trans
              message=":count packages"
              values={{count: service.packages?.length ?? 0}}
            />
          </span>
        </div>
      </Card.Content>

      <Card.Footer className="justify-between gap-3 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <InboxIcon className="size-4" />
          <Link
            to={`/dashboard/services/inquiries?service_id=${service.id}`}
            className="truncate hover:underline hover:underline-offset-3"
          >
            <Trans
              message=":count inquiries"
              values={{count: service.inquiries_count}}
            />
          </Link>
          {service.new_inquiries_count > 0 && (
            <Badge variant="secondary">
              {service.new_inquiries_count}
            </Badge>
          )}
        </div>

        <Dropdown.Root>
          <Dropdown.Trigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label={trans({message: 'Service actions'})}
          >
            <MoreHorizontalIcon />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.LinkItem render={<Link to={editPath} />}>
              <PencilIcon />
              <Trans message="Edit" />
            </Dropdown.LinkItem>
            {/* A draft's public URL 404s until it is published, so offering the link
                would be a promise the page cannot keep. */}
            {service.status === 'published' && (
              <Dropdown.LinkItem
                render={
                  <a
                    href={service.public_url}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <ExternalLinkIcon />
                <Trans message="View public page" />
              </Dropdown.LinkItem>
            )}
            <Dropdown.Item disabled={busy} onClick={onToggleStatus}>
              {service.status === 'published' ? (
                <Trans message="Move to drafts" />
              ) : (
                <Trans message="Publish" />
              )}
            </Dropdown.Item>
            <Dropdown.Separator />
            <Dropdown.Item
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              <Trans message="Delete" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </Card.Footer>

      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Media className="bg-destructive/10 text-destructive">
                <Trash2Icon />
              </AlertDialog.Media>
              <AlertDialog.Title>
                <Trans message="Delete this service?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="The service and its public page will be removed. Inquiries already received are kept." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={busy}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={busy}
                onClick={async () => {
                  if (await onDelete()) {
                    setDeleteOpen(false);
                  }
                }}
              >
                <Trans message="Delete service" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Card.Root>
  );
}

function ServiceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(item => (
        <Card.Root key={item} className="gap-0 overflow-hidden py-0">
          <Skeleton className="aspect-video w-full" />
          <Card.Content className="flex flex-col gap-3 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </Card.Content>
        </Card.Root>
      ))}
    </div>
  );
}
