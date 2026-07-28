import {UpgradeButton} from '@app/dashboard/layout/sidenav/upgrade-button';
import {UsageDialogContent} from '@app/dashboard/layout/sidenav/usage-dialog';
import {useUsage} from '@app/dashboard/use-usage';
import {GetUsage200} from '@app/gen/schemas/get-usage200';
import {useAuth} from '@common/auth/use-auth';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from '@shadcn/meter/meter';
import {Popover} from '@shadcn/popover/popover';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {SvgIconProps} from '@ui/icons/svg-icon';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {ChevronRightIcon, LinkIcon, ZapIcon} from 'lucide-react';
import {ReactElement} from 'react';

export function UsageMeter() {
  const {data} = useUsage();
  const {user} = useAuth();
  const {billing} = useSettings();
  const subscription = user?.subscription;
  const renewalDate = subscription?.renews_at;

  if (!data) {
    return null;
  }

  return (
    <Popover.Root>
      <Sidebar.Group>
        <Sidebar.GroupLabel
          className="cursor-pointer transition-colors hover:bg-sidebar-accent hover:text-accent-foreground"
          render={<Popover.Trigger openOnHover delay={0} />}
        >
          <Trans message="Usage" />
          <ChevronRightIcon />
        </Sidebar.GroupLabel>

        <Popover.Portal>
          <Popover.Content align="start" side="right" className="w-xl">
            <UsageDialogContent />
          </Popover.Content>
        </Popover.Portal>
        <Sidebar.GroupContent>
          <Sidebar.Item>
            <div className="flex flex-col gap-4">
              <UsageRow
                icon={<ZapIcon />}
                label={<Trans message="Events" />}
                usageKey="tracked_events"
              />
              <UsageRow
                icon={<LinkIcon />}
                label={<Trans message="Links" />}
                usageKey="links"
              />
              {renewalDate && (
                <p className="text-xs text-muted-foreground">
                  <Trans
                    message="Usage will reset :date"
                    values={{date: <FormattedDate date={renewalDate} />}}
                  />
                </p>
              )}
              {billing?.enable && <UpgradeButton size="sm" className="w-max" />}
            </div>
          </Sidebar.Item>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Popover.Root>
  );
}

type UsageRowProps = {
  icon: ReactElement<SvgIconProps>;
  label: React.ReactNode;
  usageKey: keyof GetUsage200['data'];
  className?: string;
};
function UsageRow({icon, label, usageKey, className}: UsageRowProps) {
  const {data} = useUsage();
  const usage = data!.data[usageKey];

  const meterValue = (
    <MeterValue>
      {() =>
        usage.total ? (
          <Trans
            message=":used of :total"
            values={{
              used: <FormattedNumber value={usage.used} notation="compact" />,
              total: <FormattedNumber value={usage.total} notation="compact" />,
            }}
          />
        ) : (
          <FormattedNumber value={usage.used} notation="compact" />
        )
      }
    </MeterValue>
  );

  const value = usage.total ? usage.used : 0;

  return (
    <Meter
      min={0}
      max={usage.total ? usage.total : value * 10}
      value={value}
      className={cn(className, 'text-xs')}
    >
      <MeterLabel>
        {icon} {label}
      </MeterLabel>
      {meterValue}
      <MeterTrack className="h-0.5">
        <MeterIndicator />
      </MeterTrack>
    </Meter>
  );
}
