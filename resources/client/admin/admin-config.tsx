import {sharedDashboardIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {SettingsNavItem} from '@common/admin/settings/settings-nav-config';
import {message} from '@ui/i18n/message';
import {
  ChartColumnBigIcon,
  CircleDollarSignIcon,
  ClipboardClockIcon,
  FilesIcon,
  GlobeIcon,
  NotebookTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SquareStackIcon,
  StoreIcon,
  TagsIcon,
  UserIcon,
  UserRoundKeyIcon,
  CreditCardIcon,
  LandmarkIcon,
  CoinsIcon,
  HelpCircleIcon,
  NewspaperIcon,
  ListTreeIcon,
} from 'lucide-react';
import {ComponentProps, ReactElement} from 'react';

// icons
export const AdminSidebarIcons: Record<
  string,
  ReactElement<ComponentProps<'svg'>>
> = {
  '/admin/insights': <ChartColumnBigIcon />,
  '/admin/settings': <SettingsIcon />,
  '/admin/settings/general': <SettingsIcon />,
  '/admin/subscriptions': <CircleDollarSignIcon />,
  '/admin/plans': <SquareStackIcon />,
  '/admin/users': <UserIcon />,
  '/admin/roles': <UserRoundKeyIcon />,
  '/admin/custom-pages': <NotebookTextIcon />,
  '/admin/tags': <TagsIcon />,
  '/admin/files': <FilesIcon />,
  '/admin/localizations': <GlobeIcon />,
  '/admin/logs': <ClipboardClockIcon />,
  '/admin/help': <HelpCircleIcon />,
  '/admin/blog': <NewspaperIcon />,
  '/admin/service-categories': <ListTreeIcon />,
  '/admin/items': <StoreIcon />,
  '/admin/payment-activity': <CircleDollarSignIcon />,
  '/admin/kyc-verifications': <ShieldCheckIcon />,
  '/admin/withdrawals': <CreditCardIcon />,
  '/admin/financial/withdrawal-methods': <CoinsIcon />,
  '/admin/financial': <LandmarkIcon />,
};

for (const [key, value] of Object.entries(sharedDashboardIcons)) {
  AdminSidebarIcons[`/admin/${key}`] = value;
}

// settings nav config
export const AppSettingsNavConfig: SettingsNavItem[] = [
  {label: message('Links'), to: 'links', position: 2},
  {label: message('Biolinks'), to: 'biolinks', position: 2},
  {label: message('Verification'), to: 'kyc', position: 2},
  {label: message('Product'), to: 'product', position: 2},
  {label: message('Landing page'), to: 'landing-page', position: 2},
  {label: message('Ads'), to: 'ads', position: 20},
];

// docs urls
const base = 'https://support.vebto.com/hc/articles';
export const AdminDocsUrls = {
  manualUpdate: `${base}/21/23/295/updating-to-new-versions#method-2-manual-update`,
  settings: {
    uploading: `${base}/21/79/297/configuring-file-upload`,
    s3: `${base}/21/25/216/storing-files-on-amazon-s3`,
    backblaze: `${base}/21/25/217/storing-files-on-backblaze`,
    authentication: `${base}/21/25/274/authentication-settings`,
  } as any,
  pages: {
    roles: `${base}/21/47/154/roles-and-permissions`,
    translations: `${base}/21/25/296/language-and-translation`,
  } as any,
};
