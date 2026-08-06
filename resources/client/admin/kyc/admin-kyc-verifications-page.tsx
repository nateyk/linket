import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {
  BadgeCheckIcon,
  CheckIcon,
  EyeIcon,
  FileClockIcon,
  FileX2Icon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';

type KycStatus = 'pending' | 'approved' | 'rejected';

type KycVerification = {
  id: number;
  document_type: 'national_id' | 'passport';
  document_number: string;
  status: KycStatus;
  rejection_reason?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  documents?: Record<string, string>;
  user?: {id: number; name: string; email: string; image?: string | null};
};

type PaginatedResponse = {
  data: KycVerification[];
  links?: Record<string, string | null>;
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
  };
};

const filters: Array<{key: string; label: React.ReactNode; value?: KycStatus}> = [
  {key: 'all', label: <Trans message="All" />},
  {key: 'pending', label: <Trans message="Pending" />, value: 'pending'},
  {key: 'approved', label: <Trans message="Approved" />, value: 'approved'},
  {key: 'rejected', label: <Trans message="Rejected" />, value: 'rejected'},
];

export function Component() {
  const [verifications, setVerifications] = useState<KycVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<KycVerification>();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({perPage: '15'});
      if (filter !== 'all') {
        params.set('status', filter);
      }
      const response = await fetch(
        `/api/v1/admin/kyc-verifications?${params.toString()}`,
        {credentials: 'same-origin', headers: {Accept: 'application/json'}},
      );
      if (!response.ok) {
        throw new Error('Unable to load verification requests.');
      }
      const payload: PaginatedResponse = await response.json();
      setVerifications(payload.data ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to load verification requests.',
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const pendingCount = useMemo(
    () => verifications.filter(v => v.status === 'pending').length,
    [verifications],
  );

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div>
          <DashboardLayout.SectionTitle>
            <Trans message="KYC Verification" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Review creator identity verification requests." />
          </p>
        </div>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Verification requests" />
              </Card.Title>
              <Card.Description>
                <Trans message="Review identity documents and approve or reject creators." />
              </Card.Description>
            </Card.Header>
            <Card.Content className="overflow-x-auto">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {filters.map(item => (
                  <Button
                    key={item.key}
                    size="xs"
                    variant={filter === item.key ? 'default' : 'outline'}
                    color={filter === item.key ? 'primary' : undefined}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                    {item.key === 'pending' && (
                      <span className="text-muted-foreground">
                        ({pendingCount})
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="User" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Document" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Document number" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head className="text-end">
                      <Trans message="Actions" />
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="Loading…" />
                      </Table.Cell>
                    </Table.Row>
                  ) : verifications.length ? (
                    verifications.map(verification => (
                      <Table.Row key={verification.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            {verification.user?.image ? (
                              <img
                                className="size-9 rounded-full object-cover"
                                src={verification.user.image}
                                alt=""
                              />
                            ) : (
                              <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                                <ShieldCheckIcon className="size-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {verification.user?.name ?? '—'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {verification.user?.email}
                              </p>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          {verification.document_type === 'passport' ? (
                            <Trans message="Passport" />
                          ) : (
                            <Trans message="National ID" />
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {verification.document_number}
                        </Table.Cell>
                        <Table.Cell>
                          <StatusBadge status={verification.status} />
                        </Table.Cell>
                        <Table.Cell className="text-end">
                          <Button
                            size="xs"
                            variant="outline"
                            color="primary"
                            onClick={() => setSelected(verification)}
                          >
                            <EyeIcon />
                            <Trans message="Review" />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="No verification requests found." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </Card.Content>
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
    </DashboardLayout.MainSection>
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
            <Trans message="Document type: :type" values={{type: verification.document_type}} />
          </span>
          <span>
            <Trans message="Document number: :number" values={{number: verification.document_number}} />
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
        {verification.status === 'rejected' && verification.rejection_reason && (
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
