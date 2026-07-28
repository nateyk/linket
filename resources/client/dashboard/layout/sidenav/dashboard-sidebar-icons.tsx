import {
  ChartColumnBigIcon,
  FolderIcon,
  FormIcon,
  GlobeIcon,
  LayoutPanelTopIcon,
  LinkIcon,
  MousePointerClickIcon,
  PictureInPicture2Icon,
  QrCodeIcon,
  SearchIcon,
} from 'lucide-react';
import {ComponentProps, ReactElement} from 'react';

export const sharedDashboardIcons: Record<
  string,
  ReactElement<ComponentProps<'svg'>>
> = {
  links: <LinkIcon />,
  'qr-codes': <QrCodeIcon />,
  biolinks: <LayoutPanelTopIcon />,
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
  '/dashboard/insights': <ChartColumnBigIcon />,
  '/dashboard/search': <SearchIcon />,
};

for (const [key, value] of Object.entries(sharedDashboardIcons)) {
  dashboardSidebarIcons[`/dashboard/${key}`] = value;
}
