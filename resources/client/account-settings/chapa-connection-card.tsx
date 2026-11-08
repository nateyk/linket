import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Input} from '@shadcn/forms/input/input';
import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';

export type ChapaGatewayState = {
  collector: 'verify_et' | 'chapa';
  has_secret: boolean;
  public_key_masked: string | null;
  chapa_checkout_available: boolean;
  pro: boolean;
};

export type ChapaConnectionError = 'rejected' | 'pro' | 'save' | 'collector' | 'load';

export const emptyChapaGateway: ChapaGatewayState = {
  collector: 'verify_et',
  has_secret: false,
  public_key_masked: null,
  chapa_checkout_available: false,
  pro: false,
};

export function readChapaGateway(data: unknown): ChapaGatewayState {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return emptyChapaGateway;
  }
  const row = data as Partial<ChapaGatewayState>;
  return {
    collector: row.collector === 'chapa' ? 'chapa' : 'verify_et',
    has_secret: row.has_secret === true,
    public_key_masked: typeof row.public_key_masked === 'string' ? row.public_key_masked : null,
    chapa_checkout_available: row.chapa_checkout_available === true,
    pro: row.pro === true,
  };
}

export function ChapaConnectionCard({
  gateway,
  publicKey,
  secretKey,
  busy,
  error,
  onPublicKey,
  onSecretKey,
  onSave,
  onSelect,
}: {
  gateway: ChapaGatewayState;
  publicKey: string;
  secretKey: string;
  busy: boolean;
  error: ChapaConnectionError | null;
  onPublicKey: (value: string) => void;
  onSecretKey: (value: string) => void;
  onSave: () => void;
  onSelect: (collector: ChapaGatewayState['collector']) => void;
}) {
  const paused = gateway.collector === 'chapa' && !gateway.pro;
  const canSave = gateway.pro && !busy && publicKey.trim().length > 0 && secretKey.trim().length > 0;
  const [upgradeNotice, setUpgradeNotice] = useState(false);

  const choose = (collector: ChapaGatewayState['collector']) => {
    if (collector === 'chapa' && !gateway.pro) {
      setUpgradeNotice(true);
      return;
    }
    setUpgradeNotice(false);
    onSelect(collector);
  };

  if (!gateway.pro) {
    return (
      <Card.Root size="sm">
        <Card.Header>
          <Card.Title>
            <Trans message="Chapa" />
          </Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              <Trans message="Active collector" />
            </span>
            <ToggleGroup variant="segmented" buttonVariant="ghost" value={[gateway.collector]} disabled={busy}>
              <Toggle value="verify_et" disabled={busy} onClick={() => choose('verify_et')}>
                <Trans message="Bank accounts" />
              </Toggle>
              <Toggle value="chapa" disabled={busy} onClick={() => choose('chapa')}>
                <Trans message="Chapa" />
              </Toggle>
            </ToggleGroup>
          </div>
          {upgradeNotice && (
            <p role="status" className="text-sm text-muted-foreground">
              <Trans message="You need to upgrade to Pro to use Chapa." />
            </p>
          )}
          {paused && (
            <p role="status" className="text-sm text-warning">
              <Trans message="Chapa checkout is paused until Pro is active." />
            </p>
          )}
        </Card.Content>
      </Card.Root>
    );
  }

  return (
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title>
          <Trans message="Chapa" />
        </Card.Title>
        <Card.Description>
          <Trans message="Pro sellers collect store payments with their own Chapa account. Bank accounts stay saved when Chapa is selected." />
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            <Trans message="Active collector" />
          </span>
          <ToggleGroup variant="segmented" buttonVariant="ghost" value={[gateway.collector]} disabled={busy}>
            <Toggle value="verify_et" disabled={busy} onClick={() => choose('verify_et')}>
              <Trans message="Bank accounts" />
            </Toggle>
            <Toggle
              value="chapa"
              disabled={busy || !gateway.has_secret}
              onClick={() => choose('chapa')}
            >
              <Trans message="Chapa" />
            </Toggle>
          </ToggleGroup>
          {gateway.chapa_checkout_available ? (
            <p className="text-sm text-muted-foreground">
              <Trans message="New checkouts use Chapa." />
            </p>
          ) : gateway.collector === 'verify_et' ? (
            <p className="text-sm text-muted-foreground">
              <Trans message="New checkouts use bank accounts." />
            </p>
          ) : null}
        </div>

        {gateway.has_secret && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              <Trans message="A secret key is stored." />
            </p>
            {gateway.public_key_masked && (
              <p className="text-sm font-medium tabular-nums">{gateway.public_key_masked}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="chapa-public-key" className="text-sm font-medium">
            <Trans message="Public key" />
          </label>
          <Input
            bindToHookForm={false}
            id="chapa-public-key"
            className="h-11"
            autoComplete="off"
            value={publicKey}
            disabled={busy}
            onChange={event => onPublicKey(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="chapa-secret-key" className="text-sm font-medium">
            <Trans message="Secret key" />
          </label>
          <Input
            bindToHookForm={false}
            id="chapa-secret-key"
            type="password"
            className="h-11"
            autoComplete="new-password"
            value={secretKey}
            disabled={busy}
            onChange={event => onSecretKey(event.target.value)}
          />
        </div>

        {error === 'rejected' && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Chapa did not accept this secret key." />
          </p>
        )}
        {error === 'pro' && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="You need to upgrade to Pro to use Chapa." />
          </p>
        )}
        {error === 'save' && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Unable to save Chapa keys. Try again." />
          </p>
        )}
        {error === 'collector' && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Unable to update the payment collector. Try again." />
          </p>
        )}
        {error === 'load' && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Unable to load Chapa. Try again." />
          </p>
        )}

        <div>
          <Button type="button" disabled={!canSave} onClick={onSave}>
            {busy ? <Trans message="Saving…" /> : <Trans message="Save Chapa keys" />}
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  );
}
