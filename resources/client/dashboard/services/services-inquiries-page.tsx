import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Select} from '@shadcn/forms/select/select';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  InboxIcon,
  MailIcon,
  PhoneIcon,
  Trash2Icon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router';
import {
  buildInquiryQuery,
  inquiryStatusMessage,
  inquiryStatusVariant,
  type InquiryStatus,
} from './service-inquiry-filters';

type ServiceOption = {id: number; title: string};

type ServiceInquiry = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  status: InquiryStatus;
  read_at?: string | null;
  created_at: string;
  service?: {id: number; title: string; slug: string} | null;
  package?: {id: number; name: string} | null;
};

type InquiriesResponse = {
  data?: ServiceInquiry[];
  meta?: {current_page: number; last_page: number; total: number};
};

const STATUSES: InquiryStatus[] = [
  'new',
  'contacted',
  'won',
  'lost',
  'archived',
];

export function Component() {
  const {trans} = useTrans();
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceId, setServiceId] = useState(
    searchParams.get('service_id') ?? '',
  );
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [meta, setMeta] = useState<InquiriesResponse['meta']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedId, setSelectedId] = useState<number>();
  const [selected, setSelected] = useState<ServiceInquiry>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await apiClient.get(
        buildInquiryQuery({serviceId, status, page}),
      );
      const payload = response.data as InquiriesResponse;
      setInquiries(payload.data ?? []);
      setMeta(payload.meta);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to load inquiries.'}),
      );
    } finally {
      setLoading(false);
    }
  }, [serviceId, status, page, trans]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    apiClient
      .get('/api/v1/services?per_page=100')
      .then(response => {
        setServices(
          ((response.data as {data?: ServiceOption[]}).data ?? []).map(
            service => ({id: service.id, title: service.title}),
          ),
        );
      })
      .catch(() => setServices([]));
  }, []);

  const openInquiry = async (inquiry: ServiceInquiry) => {
    setSelectedId(inquiry.id);
    setSelected(inquiry);
    setDetailLoading(true);

    try {
      const response = await apiClient.get(
        `/api/v1/services/inquiries/${inquiry.id}`,
      );
      setSelected((response.data as {data: ServiceInquiry}).data);
      await load();
    } catch {
      // The list payload already has the message; keep the dialog usable.
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (nextStatus: InquiryStatus) => {
    if (!selected) return;
    setSaving(true);

    try {
      const response = await apiClient.patch(
        `/api/v1/services/inquiries/${selected.id}`,
        {status: nextStatus},
      );
      setSelected((response.data as {data: ServiceInquiry}).data);
      setInquiries(current =>
        current.map(inquiry =>
          inquiry.id === selected.id
            ? {...inquiry, status: nextStatus}
            : inquiry,
        ),
      );
      toast.positive(message('Inquiry updated'));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to update inquiry.'}),
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setSaving(true);

    try {
      await apiClient.delete(`/api/v1/services/inquiries/${selected.id}`);
      toast.positive(message('Inquiry deleted'));
      setSelected(undefined);
      setSelectedId(undefined);
      setDeleteOpen(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to delete inquiry.'}),
      );
    } finally {
      setSaving(false);
    }
  };

  const applyServiceFilter = (value: string) => {
    setServiceId(value);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('service_id', value);
    } else {
      next.delete('service_id');
    }
    setSearchParams(next, {replace: true});
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={trans({message: 'Back to services'})}
          render={<Link to="/dashboard/services" />}
        >
          <ArrowLeftIcon />
        </Button>
        <DashboardLayout.SectionTitle>
          <Trans message="Inquiries" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-5">
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              {error}
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Select.Root
              value={serviceId}
              onValueChange={value => applyServiceFilter(String(value))}
            >
              <Select.Trigger className="min-w-44">
                <Select.Value>
                  {serviceId
                    ? (services.find(
                        service => String(service.id) === serviceId,
                      )?.title ?? trans(message('All services')))
                    : trans(message('All services'))}
                </Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="">{trans(message('All services'))}</Select.Item>
                {services.map(service => (
                  <Select.Item key={service.id} value={String(service.id)}>
                    {service.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <Select.Root
              value={status}
              onValueChange={value => {
                setStatus(String(value));
                setPage(1);
              }}
            >
              <Select.Trigger className="min-w-40">
                <Select.Value>
                  {status
                    ? inquiryStatusMessage(status).message
                    : trans(message('All statuses'))}
                </Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="">
                  {trans(message('All statuses'))}
                </Select.Item>
                {STATUSES.map(item => (
                  <Select.Item key={item} value={item}>
                    {inquiryStatusMessage(item).message}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          {loading ? (
            <InquirySkeleton />
          ) : inquiries.length ? (
            <div className="flex flex-col gap-2">
              {inquiries.map(inquiry => (
                <InquiryRow
                  key={inquiry.id}
                  inquiry={inquiry}
                  onOpen={() => void openInquiry(inquiry)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-card border border-dashed py-16 text-center">
              <InboxIcon className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                <Trans message="No inquiries yet" />
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                <Trans message="When someone asks about a service, their message appears here." />
              </p>
            </div>
          )}

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(current => Math.max(1, current - 1))}
              >
                <Trans message="Previous" />
              </Button>
              <span className="text-sm text-muted-foreground">
                <Trans
                  message="Page :page of :last"
                  values={{page: meta.current_page, last: meta.last_page}}
                />
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage(current => current + 1)}
              >
                <Trans message="Next" />
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout.SectionContent>

      <Dialog.Root
        open={!!selectedId}
        onOpenChange={open => {
          if (!open) {
            setSelectedId(undefined);
            setSelected(undefined);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {selected?.service?.title ?? (
                  <Trans message="Inquiry" />
                )}
              </Dialog.Title>
              {selected?.package && (
                <Dialog.Description>
                  <Trans
                    message="Package: :package"
                    values={{package: selected.package.name}}
                  />
                </Dialog.Description>
              )}
            </Dialog.Header>

            {detailLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : selected ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={inquiryStatusVariant(selected.status)}>
                    {inquiryStatusMessage(selected.status).message}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    <FormattedDate
                      date={selected.created_at}
                      preset="timestamp"
                    />
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-base font-medium">{selected.name}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <a
                      href={`mailto:${selected.email}`}
                      className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                    >
                      <MailIcon className="size-4" />
                      {selected.email}
                    </a>
                    {selected.phone && (
                      <a
                        href={`tel:${selected.phone}`}
                        className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                      >
                        <PhoneIcon className="size-4" />
                        {selected.phone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-card-sm bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select.Root
                    value={selected.status}
                    onValueChange={value =>
                      void updateStatus(value as InquiryStatus)
                    }
                  >
                    <Select.Trigger disabled={saving}>
                      <Select.Value>
                        {inquiryStatusMessage(selected.status).message}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      {STATUSES.map(statusOption => (
                        <Select.Item key={statusOption} value={statusOption}>
                          {inquiryStatusMessage(statusOption).message}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>

                  <Button
                    variant="outline"
                    color="danger"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    <Trans message="Delete" />
                  </Button>
                </div>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Media className="bg-destructive/10 text-destructive">
                <Trash2Icon />
              </AlertDialog.Media>
              <AlertDialog.Title>
                <Trans message="Delete this inquiry?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="This removes the message permanently." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={saving}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={saving}
                onClick={() => void remove()}
              >
                <Trans message="Delete inquiry" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </DashboardLayout.MainSection>
  );
}

function InquiryRow({
  inquiry,
  onOpen,
}: {
  inquiry: ServiceInquiry;
  onOpen: () => void;
}) {
  return (
    <Card.Root className="py-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-2 p-4 text-start outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex w-full flex-wrap items-center gap-2">
          {inquiry.read_at === null && (
            <span
              className="size-2 shrink-0 rounded-full bg-primary"
              aria-label={inquiryStatusMessage('new').message}
            />
          )}
          <span className="text-sm font-medium">{inquiry.name}</span>
          <span className="truncate text-sm text-muted-foreground">
            {inquiry.email}
          </span>
          <span className="ms-auto text-xs text-muted-foreground">
            <FormattedDate date={inquiry.created_at} preset="timestamp" />
          </span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">
            {inquiry.service?.title}
          </span>
          {inquiry.package && (
            <span className="text-xs text-muted-foreground">
              {inquiry.package.name}
            </span>
          )}
          <Badge
            variant={inquiryStatusVariant(inquiry.status)}
            className="ms-auto"
          >
            {inquiryStatusMessage(inquiry.status).message}
          </Badge>
        </div>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {inquiry.message}
        </p>
      </button>
    </Card.Root>
  );
}

function InquirySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map(item => (
        <Skeleton key={item} className="h-24 w-full rounded-card" />
      ))}
    </div>
  );
}
