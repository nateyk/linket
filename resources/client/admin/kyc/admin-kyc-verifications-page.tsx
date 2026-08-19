import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Popover} from '@shadcn/popover/popover';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {Select} from '@shadcn/forms/select/select';
import {
  BadgeCheckIcon,
  CheckIcon,
  CircleQuestionMarkIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  FileClockIcon,
  FileX2Icon,
  HashIcon,
  SearchIcon,
  ShieldCheckIcon,
  TrashIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

type KycStatus = 'pending' | 'approved' | 'rejected';
type DocumentType = 'national_id' | 'passport';

type KycVerification = {
  id: number;
  document_type: DocumentType;
  document_number: string;
  status: KycStatus;
  rejection_reason?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  documents?: Record<string, string>;
  user?: {id: number; name: string; email: string; image?: string | null};
};

type PaginationLinks = Record<string, string | null>;
type PaginationMeta = {
  current_page: number;
  last_page: number;
  total: number;
};

type CountersMeta = {
  counters: {
    pending: {total: number};
    approved: {total: number};
    rejected: {total: number};
  };
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function Component() {
  const [verifications, setVerifications] = useState<KycVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('all');
  const [documentType, setDocumentType] = useState('all');

  const [links, setLinks] = useState<PaginationLinks>();
  const [meta, setMeta] = useState<PaginationMeta & CountersMeta>();

  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<KycVerification>();
  const [deleteTarget, setDeleteTarget] = useState<KycVerification>();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (page: number = currentPage) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({perPage: '15'});
        if (search) params.set('search', search);
        if (status !== 'all') params.set('status', status);
        if (documentType !== 'all') params.set('document_type', documentType);
        if (page > 1) params.set('page', String(page));

        const response = await apiClient.get(
          `/api/v1/admin/kyc-verifications?${params.toString()}`,
        );
        setVerifications(response.data.data ?? []);
        setLinks(response.data.links ?? {});
        setMeta({
          ...response.data.meta,
          counters: response.data.meta?.counters ?? {
            pending: {total: 0},
            approved: {total: 0},
            rejected: {total: 0},
          },
        });
        setCurrentPage(response.data.meta?.current_page ?? 1);
        setError(undefined);
      } catch {
        setError('Unable to load verification requests.');
      } finally {
        setLoading(false);
      }
    },
    [search, status, documentType, currentPage],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setDocumentType('all');
    setCurrentPage(1);
  };

  const approve = async (verification: KycVerification) => {
    setSaving(true);
    try {
      await apiClient.post(
        `/api/v1/admin/kyc-verifications/${verification.id}/approve`,
      );
      setSelected(undefined);
      await load();
    } catch {
      setError('Unable to approve verification request.');
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiClient.post(
        `/api/v1/admin/kyc-verifications/${selected.id}/reject`,
        {reason: reason.trim() || 'Documents did not pass verification.'},
      );
      setSelected(undefined);
      setReason('');
      await load();
    } catch {
      setError('Unable to reject verification request.');
    } finally {
      setSaving(false);
    }
  };

  const destroy = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(
        `/api/v1/admin/kyc-verifications/${deleteTarget.id}`,
      );
      setDeleteTarget(undefined);
      await load();
    } catch {
      setError('Unable to delete verification request.');
    } finally {
      setDeleting(false);
    }
  };

  const counters = meta?.counters;

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="KYC Verifications" />
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CounterCard
              title="Pending"
              count={counters?.pending?.total ?? 0}
              icon={<ClockIcon className="size-6" />}
              tone="amber"
            />
            <CounterCard
              title="Approved"
              count={counters?.approved?.total ?? 0}
              icon={<BadgeCheckIcon className="size-6" />}
              tone="green"
            />
            <CounterCard
              title="Rejected"
              count={counters?.rejected?.total ?? 0}
              icon={<XCircleIcon className="size-6" />}
              tone="red"
            />
          </div>

          <Card.Root>
            <div className="border-b p-4">
              <form
                className="grid grid-cols-1 gap-3 sm:grid-cols-12"
                onSubmit={e => {
                  e.preventDefault();
                  applyFilters();
                }}
              >
                <div className="sm:col-span-5">
                  <Input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <Select.Root
                    value={documentType}
                    onValueChange={value =>
                      setDocumentType(String(value ?? 'all'))
                    }
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Document Type" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">
                        <Trans message="All types" />
                      </Select.Item>
                      <Select.Item value="national_id">
                        <Trans message="National ID" />
                      </Select.Item>
                      <Select.Item value="passport">
                        <Trans message="Passport" />
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </div>
                <div className="sm:col-span-2">
                  <Select.Root
                    value={status}
                    onValueChange={value => setStatus(String(value ?? 'all'))}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Status" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">
                        <Trans message="All statuses" />
                      </Select.Item>
                      <Select.Item value="pending">
                        <Trans message="Pending" />
                      </Select.Item>
                      <Select.Item value="approved">
                        <Trans message="Approved" />
                      </Select.Item>
                      <Select.Item value="rejected">
                        <Trans message="Rejected" />
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </div>
                <div className="sm:col-span-1">
                  <Button type="submit" className="w-full">
                    <SearchIcon />
                  </Button>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={resetFilters}
                  >
                    <Trans message="Reset" />
                  </Button>
                </div>
              </form>
            </div>
            <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="ID" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="User details" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Document Type" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Document Number" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Submitted Date" />
                    </Table.Head>
                    <Table.Head />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={7}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="Loading…" />
                      </Table.Cell>
                    </Table.Row>
                  ) : verifications.length ? (
                    verifications.map(v => (
                      <Table.Row key={v.id}>
                        <Table.Cell>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-foreground hover:underline"
                            onClick={() => setSelected(v)}
                          >
                            <HashIcon className="size-3.5 text-muted-foreground" />
                            <span>{v.id}</span>
                          </button>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            {v.user?.image ? (
                              <img
                                className="rounded-3 size-9 object-cover"
                                src={v.user.image}
                                alt=""
                              />
                            ) : (
                              <div className="rounded-3 flex size-9 items-center justify-center bg-muted">
                                <ShieldCheckIcon className="size-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {v.user?.name ?? '—'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {v.user?.email}
                              </p>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {v.document_type === 'passport' ? (
                            <Trans message="Passport" />
                          ) : (
                            <Trans message="National ID" />
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {v.document_number}
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <StatusBadge status={v.status} />
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {formatDate(v.created_at)}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex justify-end">
                            <Dropdown>
                              <Dropdown.Trigger
                                className="flex size-8 items-center justify-center rounded-input hover:bg-muted"
                                aria-label="Actions"
                              >
                                <EllipsisVerticalIcon className="size-4 text-muted-foreground" />
                              </Dropdown.Trigger>
                              <Dropdown.Content align="end">
                                <Dropdown.Item onClick={() => setSelected(v)}>
                                  <EyeIcon />
                                  <Trans message="Details" />
                                </Dropdown.Item>
                                <Dropdown.Separator />
                                <Dropdown.Item
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(v)}
                                >
                                  <TrashIcon />
                                  <Trans message="Delete" />
                                </Dropdown.Item>
                              </Dropdown.Content>
                            </Dropdown>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell
                        colSpan={7}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="No verification requests found." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <Trans
                    message="Showing :from - :to of :total"
                    values={{
                      from: (meta.current_page - 1) * 15 + 1,
                      to: Math.min(meta.current_page * 15, meta.total),
                      total: meta.total,
                    }}
                  />
                </p>
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!links?.prev}
                    onClick={() => {
                      if (links?.prev) void load(currentPage - 1);
                    }}
                  >
                    <Trans message="Previous" />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!links?.next}
                    onClick={() => {
                      if (links?.next) void load(currentPage + 1);
                    }}
                  >
                    <Trans message="Next" />
                  </Button>
                </div>
              </div>
            )}
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      {selected && (
        <ReviewDialog
          verification={selected}
          reason={reason}
          setReason={setReason}
          saving={saving}
          onClose={() => setSelected(undefined)}
          onApprove={() => void approve(selected)}
          onReject={() => void reject()}
        />
      )}

      {deleteTarget && (
        <Dialog.Root
          open={!!deleteTarget}
          onOpenChange={open => !open && setDeleteTarget(undefined)}
        >
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Content className="sm:max-w-md">
              <Dialog.Header>
                <Dialog.Title>
                  <Trans message="Delete verification request" />
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Trans
                  message="Are you sure you want to delete verification request #:id for :name? This action cannot be undone."
                  values={{
                    id: deleteTarget.id,
                    name: deleteTarget.user?.name ?? '',
                  }}
                />
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(undefined)}
                  disabled={deleting}
                >
                  <Trans message="Cancel" />
                </Button>
                <Button
                  color="danger"
                  onClick={() => void destroy()}
                  disabled={deleting}
                >
                  <TrashIcon />
                  <Trans message="Delete" />
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </DashboardLayout.MainSection>
  );
}

function CounterCard({
  title,
  count,
  icon,
  tone,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  tone: 'amber' | 'green' | 'red';
}) {
  const tones: Record<string, string> = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };
  const iconTones: Record<string, string> = {
    amber: 'text-amber-500',
    green: 'text-emerald-500',
    red: 'text-red-500',
  };
  return (
    <div
      className={`relative overflow-hidden rounded-card border p-5 ${tones[tone]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{count}</p>
        </div>
        <div className={iconTones[tone]}>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({status}: {status: KycStatus}) {
  if (status === 'approved') {
    return (
      <Badge variant="positive">
        <BadgeCheckIcon />
        <Trans message="Approved" />
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive">
        <FileX2Icon />
        <Trans message="Rejected" />
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <FileClockIcon />
      <Trans message="Pending" />
    </Badge>
  );
}

interface ReviewDialogProps {
  verification: KycVerification;
  reason: string;
  setReason: (value: string) => void;
  saving: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function ReviewDialog({
  verification,
  reason,
  setReason,
  saving,
  onClose,
  onApprove,
  onReject,
}: ReviewDialogProps) {
  const documentKeys =
    verification.document_type === 'passport'
      ? ['passport']
      : ['front_of_id', 'back_of_id'];
  const allKeys = verification.documents
    ? [...documentKeys, 'selfie'].filter(key => verification.documents?.[key])
    : documentKeys;

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-2xl">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Review verification request" />
            </Dialog.Title>
            <Dialog.Description>
              {verification.user?.name} ({verification.user?.email})
            </Dialog.Description>
          </Dialog.Header>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={verification.status} />
            <span>
              <Trans
                message="Document type: :type"
                values={{type: verification.document_type}}
              />
            </span>
            <span>
              <Trans
                message="Document number: :number"
                values={{number: verification.document_number}}
              />
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {allKeys.map(key => (
              <DocumentImage
                key={key}
                label={key}
                src={verification.documents?.[key]}
              />
            ))}
          </div>
          {verification.status === 'rejected' &&
            verification.rejection_reason && (
              <p className="mt-4 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <Trans
                  message="Previously rejected: :reason"
                  values={{reason: verification.rejection_reason}}
                />
              </p>
            )}
          {verification.status === 'pending' && (
            <div className="mt-5">
              <Field.Root name="reason">
                <Field.Label>
                  <Trans message="Rejection reason (optional)" />
                </Field.Label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Documents are not readable or do not match the user."
                />
                <Field.Description>
                  <Trans message="The reason is only shown to the creator if the request is rejected." />
                </Field.Description>
              </Field.Root>
            </div>
          )}
          <Dialog.Footer>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              <Trans message="Close" />
            </Button>
            {verification.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  color="danger"
                  onClick={onReject}
                  disabled={saving}
                >
                  <XIcon />
                  <Trans message="Reject" />
                </Button>
                <Button color="primary" onClick={onApprove} disabled={saving}>
                  <CheckIcon />
                  {saving ? (
                    <Trans message="Saving…" />
                  ) : (
                    <Trans message="Approve" />
                  )}
                </Button>
              </>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DocumentImage({label, src}: {label: string; src?: string}) {
  const title =
    label === 'selfie'
      ? 'Selfie'
      : label === 'front_of_id'
        ? 'Front of ID'
        : label === 'back_of_id'
          ? 'Back of ID'
          : 'Passport';
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">{title}</p>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img
            className="h-48 w-full rounded-input border object-cover"
            src={src}
            alt={title}
          />
        </a>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-input border bg-muted text-sm text-muted-foreground">
          <Trans message="No document uploaded" />
        </div>
      )}
    </div>
  );
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-sm" />}
        className="text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Trans message="Review and approve or reject identity documents submitted by creators for KYC verification." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
