import {UpgradeButton} from '@app/dashboard/layout/sidenav/upgrade-button';
import {useUsage} from '@app/dashboard/use-usage';
import {GetUsage200Data} from '@app/gen/schemas/get-usage200-data';
import {useAuth} from '@common/auth/use-auth';
import {useShouldShowUpgradeMessage} from '@common/billing/upgrade/no-permission-button';
import {Badge} from '@shadcn/badge/badge';
import {Meter, MeterLabel} from '@shadcn/meter/meter';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {Skeleton} from '@ui/skeleton/skeleton';
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {ReactElement, ReactNode} from 'react';

const usageLabels: Partial<
  Record<
    keyof GetUsage200Data,
    {
      label: ReactNode;
      tone: string;
      formatValue?: (value: number) => string | number | ReactElement;
    }
  >
> = {
  free_products: {
    label: <Trans message="Free products" />,
    tone: 'var(--color-primary)',
  },
  paid_products: {
    label: <Trans message="Paid products" />,
    tone: 'var(--color-positive)',
  },
  storage: {
    label: <Trans message="Storage" />,
    tone: 'var(--color-warning)',
    formatValue: value => prettyBytes(value),
  },
  storefronts: {
    label: <Trans message="Storefronts" />,
    tone: 'color-mix(in oklch, var(--color-primary) 55%, var(--color-destructive))',
  },
  tracked_events: {
    label: <Trans message="Tracked events" />,
    tone: 'var(--color-muted-foreground)',
  },
  workspaces: {
    label: <Trans message="Workspaces" />,
    tone: 'var(--color-destructive)',
  },
} as const;

export function UsageDialogContent() {
  const {data} = useUsage();
  const {user} = useAuth();
  const subscription = user?.subscription;
  const renewalDate = subscription?.renews_at;
  const shouldShowUpgradeMessage = useShouldShowUpgradeMessage();

  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <UsageGrid />
      {renewalDate && (
        <p className="text-xs text-muted-foreground">
          <Trans
            message="Usage will reset :date"
            values={{date: <FormattedDate date={renewalDate} />}}
          />
        </p>
      )}
      {shouldShowUpgradeMessage ? (
        <UpgradeButton
          variant="default"
          color="primary"
          className="w-full"
          size="sm"
        >
          <Trans message="Upgrade now" />
        </UpgradeButton>
      ) : null}
    </div>
  );
}

export function UsageGrid() {
  const {data} = useUsage();
  const rows = Object.entries(usageLabels).map(([key, label]) => {
    const usage = data?.data[key as keyof typeof usageLabels];
    const unlimited = !usage || usage.total === null;
    const percentage = usage ? getUsagePercentage(usage.used, usage.total) : 0;
    const atLimit = !!usage && usage.total !== null && usage.used >= usage.total;

    return {key, label, usage, unlimited, percentage, atLimit};
  });
  const limited = rows.filter(row => row.usage && !row.unlimited);
  const atLimitCount = limited.filter(row => row.atLimit).length;
  const weightSum = limited.reduce(
    (sum, row) => sum + Math.max(row.percentage, 4),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            <Trans message="Limits" />
          </p>
          {atLimitCount > 0 ? (
            <Badge variant="destructive">
              <Trans
                message="[one :count limit reached|other :count limits reached]"
                values={{count: atLimitCount}}
              />
            </Badge>
          ) : null}
        </div>
        {limited.length > 0 ? (
          <div className="flex h-1.5 gap-0.5" aria-hidden="true">
            {limited.map(row => (
              <div
                key={row.key}
                className="h-1.5 min-w-1 rounded-full"
                style={{
                  width: `${(Math.max(row.percentage, 4) / weightSum) * 100}%`,
                  backgroundColor: row.label.tone,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2" role="list">
        {rows.map(row =>
          row.usage && row.label ? (
            <li key={row.key}>
              <GridItem
                label={row.label}
                usage={row.usage}
                percentage={row.percentage}
              />
            </li>
          ) : (
            <li key={row.key}>
              <SkeletonGridItem label={row.label!} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

type GridItemProps = {
  label: NonNullable<(typeof usageLabels)[keyof typeof usageLabels]>;
  usage: {used: number; total: number | null};
  percentage: number;
};

function GridItem({label, usage, percentage}: GridItemProps) {
  const unlimited = usage.total === null;
  const formattedUsed = label.formatValue ? (
    label.formatValue(usage.used)
  ) : (
    <FormattedNumber value={usage.used} notation="compact" />
  );

  const meterValue = unlimited ? (
    <Trans message=":used used · Unlimited" values={{used: formattedUsed}} />
  ) : (
    <Trans
      message=":used of :total"
      values={{
        used: formattedUsed,
        total: label.formatValue ? (
          label.formatValue(usage.total as number)
        ) : usage.total !== null ? (
          <FormattedNumber value={usage.total} notation="compact" />
        ) : null,
      }}
    />
  );

  return (
    <Meter
      value={percentage}
      className="grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs font-normal"
    >
      <span
        aria-hidden="true"
        className="size-2.5 rounded-full"
        style={{backgroundColor: label.tone}}
      />
      <MeterLabel className="font-normal">{label.label}</MeterLabel>
      <span className="text-muted-foreground">{meterValue}</span>
    </Meter>
  );
}

function getUsagePercentage(used: number, total: number | null): number {
  if (total === null || total <= 0) {
    return total === 0 && used > 0 ? 100 : 0;
  }

  return Math.min(Math.max((used / total) * 100, 0), 100);
}

function SkeletonGridItem({label}: {label: GridItemProps['label']}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs">
      <span aria-hidden="true" className="size-2.5 rounded-full bg-muted" />
      <span>{label.label}</span>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
