import {
  BriefcaseBusinessIcon,
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
  ShoppingBagIcon,
} from 'lucide-react';
import {ReactElement, SVGProps} from 'react';

export const sharedDashboardIcons: Record<
  string,
  ReactElement<SVGProps<SVGSVGElement>>
> = {
  links: <LinkIcon />,
  'qr-codes': <QrCodeIcon />,
  stores: <LayoutTemplateIcon />,
  biolinks: <LayoutTemplateIcon />,
  folders: <FolderIcon />,
  'custom-domains': <GlobeIcon />,
  'link-overlays': <PictureInPicture2Icon />,
  pixels: <MousePointerClickIcon />,
  'link-pages': <FormIcon />,
};

export const dashboardSidebarIcons: Record<
  string,
  ReactElement<SVGProps<SVGSVGElement>>
> = {
  '/dashboard': <HomeIcon />,
  '/dashboard/insights': <ChartColumnBigIcon />,
  '/dashboard/search': <SearchIcon />,
  '/dashboard/items': <PackageIcon />,
  '/dashboard/services': <BriefcaseBusinessIcon />,
  '/dashboard/orders': <ShoppingBagIcon />,
  '/dashboard/sales-payouts': <ShoppingBagIcon />,
  '/dashboard/sales-payments': <ShoppingBagIcon />,
};

for (const [key, value] of Object.entries(sharedDashboardIcons)) {
  dashboardSidebarIcons[`/dashboard/${key}`] = value;
}
