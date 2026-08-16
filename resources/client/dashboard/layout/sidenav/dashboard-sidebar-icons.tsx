import {
  ChartColumnBigIcon,
  FolderIcon,
  FormIcon,
  GlobeIcon,
  HomeIcon,
  LayoutTemplateIcon,
  LinkIcon,
  MousePointerClickIcon,
  PackageIcon,
  PictureInPicture2Icon,
  QrCodeIcon,
  SearchIcon,
  WalletCardsIcon,
} from 'lucide-react';
import {ComponentProps, ReactElement} from 'react';

export const sharedDashboardIcons: Record<
  string,
  ReactElement<ComponentProps<'svg'>>
> = {
  links: <LinkIcon />,
  'qr-codes': <QrCodeIcon />,
  biolinks: <LayoutTemplateIcon />,
  folders: <FolderIcon />,
  'custom-domains': <GlobeIcon />,
  'link-overlays': <PictureInPicture2Icon />,
  pixels: <MousePointerClickIcon />,
  'link-pages': <FormIcon />,
};

export const dashboardSidebarIcons: Record<
  string,
  ReactElement<ComponentProps<'svg'>>
> = {
  '/dashboard': <HomeIcon />,
  '/dashboard/insights': <ChartColumnBigIcon />,
  '/dashboard/search': <SearchIcon />,
  '/dashboard/my-products': <PackageIcon />,
  '/dashboard/sales-payouts': <WalletCardsIcon />,
};

for (const [key, value] of Object.entries(sharedDashboardIcons)) {
  dashboardSidebarIcons[`/dashboard/${key}`] = value;
}
