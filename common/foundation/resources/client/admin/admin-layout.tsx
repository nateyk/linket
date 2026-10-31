import {GetSiteAlerts200AlertsItem} from '@app/gen/schemas/get-site-alerts200-alerts-item';
import {getSiteAlertsOptions} from '@common/admin/settings/settings-queries';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {useQuery} from '@tanstack/react-query';
import {
  getFromLocalStorage,
  setInLocalStorage,
  useLocalStorage,
} from '@ui/utils/hooks/local-storage';
import {CircleXIcon, InfoIcon, XIcon} from 'lucide-react';
import {Outlet} from 'react-router';
import {AdminSidebar} from './admin-sidebar';

export function Component() {
  return (
    <DashboardLayout.Root name="admin">
      <SiteAlertsList />
      <DashboardLayout.Content>
        <AdminSidebar />
        <Outlet />
      </DashboardLayout.Content>
    </DashboardLayout.Root>
  );
}

type DismissedAlert = {
  id: string;
  timestamp: number;
};

function SiteAlertsList() {
  const {data} = useQuery(getSiteAlertsOptions());

  const [dismissedAlerts] = useLocalStorage<DismissedAlert[]>(
    'dismissed-site-alerts',
    [],
  );

  // show alert if 1 day passed since last dismiss
  const alerts = data?.alerts.filter(
    alert =>
      !dismissedAlerts?.some(
        d => d.id === alert.id && Date.now() - d.timestamp < 86400000,
      ),
  );

  if (!alerts?.length) {
    return null;
  }

  // Entire stack is non-blocking so diagnostics never intercept admin clicks.
  // Only dismiss (and in-alert links) re-enable pointer events.
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3"
    >
      {alerts.map(alert => (
        <SetupAlert key={alert.id} alert={alert} />
      ))}
    </div>
  );
}

interface SetupAlertProps {
  alert: GetSiteAlerts200AlertsItem;
}
function SetupAlert({alert}: SetupAlertProps) {
  const description = (
    <div dangerouslySetInnerHTML={{__html: alert.description}}></div>
  );

  const handleDismiss = () => {
    const dismissedAlerts =
      getFromLocalStorage<DismissedAlert[]>('dismissed-site-alerts') || [];
    const value = {
      id: alert.id,
      timestamp: Date.now(),
    };
    const i = dismissedAlerts.findIndex(v => v.id === alert.id);
    if (i === -1) {
      dismissedAlerts.push(value);
    } else {
      dismissedAlerts[i] = value;
    }
    setInLocalStorage('dismissed-site-alerts', dismissedAlerts);
  };

  return (
    <Alert.Root
      className="pointer-events-none shadow-md"
      variant="destructive"
      fillStyle="subtleFill"
      data-site-alert={alert.id}
    >
      {alert.severity === 'error' ? (
        <CircleXIcon className="text-destructive" />
      ) : (
        <InfoIcon />
      )}
      <Alert.Title>{alert.title}</Alert.Title>
      <Alert.Description className="pointer-events-auto [&_a]:pointer-events-auto">
        {description}
      </Alert.Description>
      <Alert.Action>
        <Button
          className="pointer-events-auto hover:bg-destructive/10"
          variant="ghost"
          size="icon-sm"
          onClick={() => handleDismiss()}
        >
          <XIcon />
        </Button>
      </Alert.Action>
    </Alert.Root>
  );
}
