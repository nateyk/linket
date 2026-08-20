import {UpgradeButton} from '@app/dashboard/layout/sidenav/upgrade-button';
import {useUsage} from '@app/dashboard/use-usage';
import {GetUsage200Data} from '@app/gen/schemas/get-usage200-data';
import {useAuth} from '@common/auth/use-auth';
import {useShouldShowUpgradeMessage} from '@common/billing/upgrade/no-permission-button';
import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
} from '@shadcn/meter/meter';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {Skeleton} from '@ui/skeleton/skeleton';
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {
  CircleDollarSignIcon,
  GiftIcon,
  HardDriveIcon,
  MousePointerClickIcon,
  StoreIcon,
  UsersIcon,
} from 'lucide-react';
import {ReactElement, ReactNode} from 'react';

export const usageLabels: Partial<
  Record<
    keyof GetUsage200Data,
    {
      label: ReactNode;
      icon: ReactNode;
      formatValue?: (value: number) => string | number | ReactElement;
    }
  >
> = {
  free_products: {
    label: <Trans message="Free products" />,
    icon: <GiftIcon className="size-4" />,
  },
  paid_products: {
    label: <Trans message="Paid products" />,
    icon: <CircleDollarSignIcon className="size-4" />,
  },
  storage: {
    label: <Trans message="Storage" />,
    icon: <HardDriveIcon className="size-4" />,
    formatValue: value => prettyBytes(value),
  },
  storefronts: {
    label: <Trans message="Storefronts" />,
    icon: <StoreIcon className="size-4" />,
  },
  tracked_events: {
    label: <Trans message="Tracked events" />,
    icon: <MousePointerClickIcon className="size-4" />,
  },
  workspaces: {
    label: <Trans message="Workspaces" />,
    icon: <UsersIcon className="size-4" />,
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
    <div>
      <UsageGrid />
      {renewalDate && (
        <p className="mt-2.5 text-xs text-muted-foreground">
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
          className="mt-6 w-full"
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
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Object.entries(usageLabels).map(([key, label]) => {
        const usage = data?.data[key as keyof typeof usageLabels];

        if (!usage) {
          return <SkeletonGridItem key={key} label={label} />;
        }

        return <GridItem key={key} label={label} usage={usage} />;
      })}
    </div>
  );
}

type GridItemProps = {
  label: NonNullable<(typeof usageLabels)[keyof typeof usageLabels]>;
  usage: {used: number; total: number | null};
};

function GridItem({label, usage}: GridItemProps) {
  const unlimited = usage.total === null;
  const isAtOrOverLimit = usage.total !== null && usage.used >= usage.total;
  const percentage = getUsagePercentage(usage.used, usage.total);

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
          label.formatValue(usage.total)
        ) : (
          <FormattedNumber value={usage.total} notation="compact" />
        ),
      }}
    />
  );

  return (
    <Meter value={percentage}>
      <MeterLabel>
        {label.icon} {label.label}
      </MeterLabel>
      {meterValue}
      {!unlimited && (
        <MeterTrack>
          <MeterIndicator
            className={isAtOrOverLimit ? 'bg-destructive' : 'bg-primary'}
          />
        </MeterTrack>
      )}
    </Meter>
  );
}

export function getUsagePercentage(used: number, total: number | null): number {
  if (total === null || total <= 0) {
    return total === 0 && used > 0 ? 100 : 0;
  }

  return Math.min(Math.max((used / total) * 100, 0), 100);
}

function SkeletonGridItem({label}: {label: GridItemProps['label']}) {
  return (
    <Meter value={0}>
      <MeterLabel>
        {label.icon} {label.label}
      </MeterLabel>
      <Skeleton className="min-w-15" />
      <MeterTrack>
        <MeterIndicator />
      </MeterTrack>
    </Meter>
  );
}
