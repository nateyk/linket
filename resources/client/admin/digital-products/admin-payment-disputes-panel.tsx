import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {useCallback, useEffect, useState} from 'react';

type DisputeRow = {
  id: string;
  reason_label?: string;
  reason: string;
  status: string;
  lifecycle_status?: string;
  order_id?: string;
  order_status?: string;
  buyer_email?: string;
  payment_evidence?: {status?: string | null} | null;
};

export function AdminPaymentDisputesPanel() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get('/api/v1/admin/storefront/payment-disputes')
      .then(response => {
        setDisputes(response.data.disputes ?? []);
        setError(undefined);
      })
      .catch(reason => {
        setDisputes([]);
        setError(
          getApiErrorMessage(reason) !== 'An error occurred.'
            ? getApiErrorMessage(reason)
            : 'Unable to load payment disputes.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (
    disputeId: string,
    status: 'investigating' | 'resolved' | 'closed',
  ) => {
    setBusyId(disputeId);
    setError(undefined);
    try {
      await apiClient.patch(
        `/api/v1/admin/storefront/payment-disputes/${disputeId}`,
        {
          status,
          note:
            status === 'closed'
              ? 'Admin closed this dispute.'
              : status === 'resolved'
                ? 'Admin marked this dispute resolved.'
                : 'Admin started investigating this dispute.',
        },
      );
      load();
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) !== 'An error occurred.'
          ? getApiErrorMessage(reason)
          : 'Unable to update this dispute.',
      );
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <Trans message="Payment disputes" />
        </Card.Title>
        <Card.Description>
          <Trans message="Review buyer payment support requests. Dispute actions never refund, release files, or mark payments verified." />
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">
            <Trans message="Loading disputes…" />
          </p>
        ) : null}
        {!loading && disputes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            <Trans message="No payment disputes yet." />
          </p>
        ) : null}
        {disputes.map(dispute => {
          const lifecycle = dispute.lifecycle_status || 'open';
          return (
            <div
              key={dispute.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-button border border-border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  {dispute.reason_label || dispute.reason}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dispute.buyer_email || '—'}
                  {dispute.order_id ? ` · ${dispute.order_id}` : ''}
                  {dispute.payment_evidence?.status
                    ? ` · ${dispute.payment_evidence.status}`
                    : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{dispute.status}</Badge>
                {lifecycle === 'open' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === dispute.id}
                    onClick={() =>
                      void updateStatus(dispute.id, 'investigating')
                    }
                  >
                    <Trans message="Investigate" />
                  </Button>
                ) : null}
                {lifecycle === 'investigating' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === dispute.id}
                    onClick={() => void updateStatus(dispute.id, 'resolved')}
                  >
                    <Trans message="Resolve" />
                  </Button>
                ) : null}
                {lifecycle === 'resolved' || lifecycle === 'investigating' ? (
                  <Button
                    size="sm"
                    disabled={busyId === dispute.id}
                    onClick={() => void updateStatus(dispute.id, 'closed')}
                  >
                    <Trans message="Close" />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </Card.Content>
    </Card.Root>
  );
}
