import {Trans} from '@ui/i18n/trans';
import {
  BookOpenIcon,
  FileDownIcon,
  GraduationCapIcon,
  MusicIcon,
  type LucideIcon,
} from 'lucide-react';

export function productTypeIcon(type?: string): LucideIcon {
  if (type === 'course') return GraduationCapIcon;
  if (type === 'ebook') return BookOpenIcon;
  if (type === 'audio') return MusicIcon;
  return FileDownIcon;
}

export function ProductTypeLabel({type}: {type?: string}) {
  if (type === 'course') return <Trans message="Course" />;
  if (type === 'ebook') return <Trans message="Ebook" />;
  if (type === 'audio') return <Trans message="Audio" />;
  return <Trans message="Digital download" />;
}
