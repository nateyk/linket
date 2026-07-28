import {sharedDashboardIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
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
import {MousePointerClickIcon} from 'lucide-react';
import {ReactNode} from 'react';

export const usageLabels: Partial<
  Record<
    keyof GetUsage200Data,
    {
      label: ReactNode;
      icon: ReactNode;
    }
  >
> = {
  links: {
    label: <Trans message="Links" />,
    icon: sharedDashboardIcons.links,
  },
  qr_codes: {
    label: <Trans message="QR codes" />,
    icon: sharedDashboardIcons['qr-codes'],
  },
  biolinks: {
    label: <Trans message="Link in bio" />,
    icon: sharedDashboardIcons.biolinks,
  },
  tracked_events: {
    label: <Trans message="Tracked events" />,
    icon: <MousePointerClickIcon />,
  },
  custom_domains: {
    label: <Trans message="Custom domains" />,
    icon: sharedDashboardIcons['custom-domains'],
  },
  link_overlays: {
    label: <Trans message="Link overlays" />,
    icon: sharedDashboardIcons['link-overlays'],
  },
  folders: {
    label: <Trans message="Folders" />,
    icon: sharedDashboardIcons.folders,
  },
  tracking_pixels: {
    label: <Trans message="Tracking pixels" />,
    icon: sharedDashboardIcons.pixels,
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
  const isAtOrOverLimit = usage.total && usage.used >= usage.total;

  const meterValue = usage.total ? (
    <div>
      <Trans
        message=":used of :total"
        values={{
          used: <FormattedNumber value={usage.used} notation="compact" />,
          total: <FormattedNumber value={usage.total} notation="compact" />,
        }}
      />
    </div>
  ) : (
    <FormattedNumber value={usage.used} notation="compact" />
  );

  return (
    <Meter value={usage.total ? usage.used : 0}>
      <MeterLabel>
        {label.icon} {label.label}
      </MeterLabel>
      {meterValue}
      <MeterTrack>
        <MeterIndicator
          className={isAtOrOverLimit ? 'bg-destructive' : 'bg-primary'}
        />
      </MeterTrack>
    </Meter>
  );
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
