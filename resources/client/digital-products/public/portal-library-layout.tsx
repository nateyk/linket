import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import type {ReactNode} from 'react';

/** Dedicated buyer-library dashboard shell — isolated from the account settings app. */
export function PortalLibraryLayout({children}: {children: ReactNode}) {
  return (
    <DashboardLayout.Root name="linket-my-portal">
      <DashboardLayout.Content>{children}</DashboardLayout.Content>
    </DashboardLayout.Root>
  );
}
