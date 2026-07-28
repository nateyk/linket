import {sharedDashboardIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {cn} from '@ui/utils/cn';
import {
  BookOpenIcon,
  BookTextIcon,
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  FileClockIcon,
  FileTextIcon,
  FileUpIcon,
  HeadsetIcon,
  InfoIcon,
  LanguagesIcon,
  LayoutGridIcon,
  MailIcon,
  RouteIcon,
  SearchIcon,
  ServerIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  TypeIcon,
  UsersIcon,
} from 'lucide-react';
import {ComponentProps, ReactElement} from 'react';

export const folderIcons: Record<
  string,
  ReactElement<ComponentProps<'svg'>>
> = {
  ...sharedDashboardIcons,
  settings: <SettingsIcon />,
  bookOpen: <BookOpenIcon />,
  accounts: <UsersIcon />,
  email: <MailIcon />,
  apps: <LayoutGridIcon />,
  reader: <BookTextIcon />,
  fileUpload: <FileUpIcon />,
  fileCopy: <CopyIcon />,
  translate: <LanguagesIcon />,
  dns: <ServerIcon />,
  tune: <SlidersHorizontalIcon />,
  fileClock: <FileClockIcon />,
  textFields: <TypeIcon />,
  altRoute: <RouteIcon />,
  support: <HeadsetIcon />,
  search: <SearchIcon />,
  info: <InfoIcon />,
  schedule: <ClockIcon />,
  language: <LanguagesIcon />,
  event: <CalendarIcon />,
  article: <FileTextIcon />,
};

export type FolderIconName = keyof typeof folderIcons;

interface Props {
  src: FolderIconName | string | null | undefined;
  className?: string;
}
export function FolderImage({src, className}: Props) {
  if (!src) return null;
  const icon = folderIcons[src as FolderIconName];
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-sm',
        className,
      )}
    >
      {icon ? (
        icon
      ) : (
        <img className={cn('size-full max-w-7')} src={src} alt="" />
      )}
    </div>
  );
}
