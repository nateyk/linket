import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {formatMoney} from '@ui/i18n/format-money';
import {CheckIcon, ClockIcon, RefreshCwIcon} from 'lucide-react';
import type {PublicServicePackage} from './service-types';

export function ServicePackagePanel({
  packages,
  onRequest,
}: {
  packages: PublicServicePackage[];
  onRequest: (packageId?: number) => void;
}) {
  if (!packages.length) {
    return (
      <Card.Root>
        <Card.Content className="flex flex-col gap-3 p-4">
          <Card.Title className="text-base">
            <Trans message="Request a quote" />
          </Card.Title>
          <p className="text-sm text-[var(--biolink-muted-text)]">
            <Trans message="Tell the creator what you need and they will send you a quote." />
          </p>
          <Button onClick={() => onRequest()}>
            <Trans message="Send inquiry" />
          </Button>
        </Card.Content>
      </Card.Root>
    );
  }

  if (packages.length === 1) {
    return (
      <PackageCard
        packageItem={packages[0]}
        onRequest={() => onRequest(packages[0].id)}
      />
    );
  }

  return (
    <Tabs.Root defaultValue={String(packages[0].id)} className="gap-3">
      <Tabs.List aria-label="Packages" className="w-full">
        {packages.map(packageItem => (
          <Tabs.Tab
            key={packageItem.id}
            value={String(packageItem.id)}
            className="flex-1"
          >
            {packageItem.name}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {packages.map(packageItem => (
        <Tabs.Panel key={packageItem.id} value={String(packageItem.id)}>
          <PackageCard
            packageItem={packageItem}
            onRequest={() => onRequest(packageItem.id)}
          />
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

function PackageCard({
  packageItem,
  onRequest,
}: {
  packageItem: PublicServicePackage;
  onRequest: () => void;
}) {
  return (
    <Card.Root>
      <Card.Content className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{packageItem.name}</h3>
          {packageItem.price_cents === null ? (
            <Badge variant="secondary">
              <Trans message="Quote only" />
            </Badge>
          ) : (
            <span className="text-lg font-semibold">
              {formatMoney(packageItem.price_cents, packageItem.currency)}
            </span>
          )}
        </div>

        {packageItem.description && (
          <p className="text-sm leading-relaxed text-[var(--biolink-muted-text)]">
            {packageItem.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--biolink-muted-text)]">
          {packageItem.delivery_days !== null && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3.5" />
              <Trans
                message=":count days delivery"
                values={{count: packageItem.delivery_days}}
              />
            </span>
          )}
          {packageItem.revisions !== null && (
            <span className="inline-flex items-center gap-1">
              <RefreshCwIcon className="size-3.5" />
              <Trans
                message=":count revisions"
                values={{count: packageItem.revisions}}
              />
            </span>
          )}
        </div>

        {!!packageItem.features.length && (
          <ul className="flex flex-col gap-1.5 text-sm">
            {packageItem.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        <Button onClick={onRequest}>
          <Trans message="Request this package" />
        </Button>
      </Card.Content>
    </Card.Root>
  );
}
