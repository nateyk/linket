import {AccountSettingsPanel} from '@common/auth/ui/account-settings/account-settings-panel';
import {apiClient} from '@common/http/query-client';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {BotIcon, RefreshCwIcon, UnplugIcon} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

type McpConnection = {
  id: string;
  workspace_id: number;
  client_id: string;
  status: 'active' | 'expired' | 'revoked';
  consented_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_accessed_at: string | null;
};

type ConnectionResponse = {
  connections: McpConnection[];
  oauth_connection_available: boolean;
};

/**
 * This is management of existing server-side consent grants, not an OAuth
 * initiation flow. ChatGPT initiates the separate, PKCE-protected consent
 * process when the operator explicitly enables the remote integration.
 */
export function ChatGptIntegrationPanel() {
  const [data, setData] = useState<ConnectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<McpConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await apiClient.get('/api/v1/creator-ai/mcp-connections');
      setData(response.data.data as ConnectionResponse);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(false);
    setDisconnected(false);

    try {
      await apiClient.delete('/api/v1/creator-ai/mcp-connections/' + selected.id);
      // The API returns history, including revoked connections. Update the
      // local record immediately so a failed refresh cannot imply continued
      // access after the server has acknowledged revocation.
      setData(current => current ? {
        ...current,
        connections: current.connections.map(connection =>
          connection.id === selected.id
            ? {...connection, status: 'revoked', revoked_at: new Date().toISOString()}
            : connection,
        ),
      } : current);
      setSelected(null);
      setDisconnected(true);
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const activeCount = data?.connections.filter(connection => connection.status === 'active').length ?? 0;

  return (
    <AccountSettingsPanel
      id="chatgpt"
      title={
        <span className="flex items-center gap-2">
          <BotIcon className="size-4" />
          <Trans message="ChatGPT" />
        </span>
      }
      titleSuffix={
        data ? (
          <Badge variant={activeCount > 0 ? 'positive' : 'secondary'}>
            {activeCount > 0 ? (
              <Trans message="Authorized" />
            ) : data.oauth_connection_available ? (
              <Trans message="Available" />
            ) : (
              <Trans message="Unavailable" />
            )}
          </Badge>
        ) : null
      }
    >
      {loading && !data ? (
        <div className="flex min-h-28 items-center justify-center" role="status">
          <Spinner />
        </div>
      ) : error && !data ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Unable to load ChatGPT connections." />
          </p>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCwIcon />
            <Trans message="Retry ChatGPT connections" />
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                <Trans message="Workspace reporting access" />
              </p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                <Trans message="Review and disconnect ChatGPT access to read-only Linket reports. Access is checked against your current workspace permissions and verified Pro status on every request." />
              </p>
            </div>
            <Button variant="outline" disabled={busy || loading} onClick={() => void load()}>
              <RefreshCwIcon />
              <Trans message="Refresh ChatGPT connections" />
            </Button>
          </div>

          {!data.oauth_connection_available ? (
            <p className="text-sm text-muted-foreground">
              <Trans message="New ChatGPT connections are not available yet." />
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Trans message="Start a Linket connection in ChatGPT and approve its access to your chosen workspace." />
            </p>
          )}

          {data.connections.length === 0 ? (
            <div className="rounded-card-sm border bg-secondary/30 p-4 text-sm text-muted-foreground">
              <Trans message="No ChatGPT connections yet." />
            </div>
          ) : (
            <ul className="divide-y rounded-card-sm border">
              {data.connections.map(connection => (
                <li key={connection.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-all text-sm font-semibold">{connection.client_id}</p>
                      <Badge variant={connection.status === 'active' ? 'positive' : 'secondary'}>
                        {connection.status === 'active' ? (
                          <Trans message="Active" />
                        ) : connection.status === 'revoked' ? (
                          <Trans message="Revoked" />
                        ) : (
                          <Trans message="Expired" />
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <Trans message={`Workspace #${connection.workspace_id}`} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Trans message="Consent expires" />{' '}
                      <FormattedDate date={connection.expires_at} preset="timestamp" />
                    </p>
                    {connection.last_accessed_at ? (
                      <p className="text-xs text-muted-foreground">
                        <Trans message="Last used" />{' '}
                        <FormattedDate date={connection.last_accessed_at} preset="timestamp" />
                      </p>
                    ) : null}
                  </div>
                  {connection.status === 'active' ? (
                    <Button
                      variant="outline"
                      color="danger"
                      disabled={busy}
                      onClick={() => setSelected(connection)}
                      aria-label="Disconnect ChatGPT connection"
                    >
                      <UnplugIcon />
                      <Trans message="Disconnect" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {disconnected ? (
            <p role="status" className="text-sm text-positive">
              <Trans message="ChatGPT connection disconnected." />
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              <Trans message="Unable to refresh ChatGPT connections. Try again." />
            </p>
          ) : null}
        </div>
      ) : null}

      <AlertDialog.Root
        open={selected !== null}
        onOpenChange={open => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Disconnect ChatGPT?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="This revokes the selected OAuth consent and its access and refresh tokens. It does not affect your other connections." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={busy}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                <Trans message="Disconnect connection" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </AccountSettingsPanel>
  );
}
