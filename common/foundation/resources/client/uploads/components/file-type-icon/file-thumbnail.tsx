import {FileEntry} from '@app/gen/schemas/file-entry';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {useFileEntryUrls} from '../../file-entry-urls';
import {FileTypeIcon} from './file-type-icon';

const TwoMB = 2 * 1024 * 1024;

interface Props {
  file: FileEntry;
  className?: string;
  iconClassName?: string;
  showImage?: boolean;
}
export function FileThumbnail({
  file,
  className,
  iconClassName,
  showImage = true,
}: Props) {
  const {trans} = useTrans();
  const {previewUrl} = useFileEntryUrls(file, {preferThumbnail: true});

  // don't show images for files larger than 2MB, if thumbnail was not generated to avoid ui lag
  if (file.file_size && file.file_size > TwoMB && !file.thumbnail) {
    showImage = false;
  }

  if (showImage && file.type === 'image' && previewUrl) {
    const alt = trans({
      message: ':fileName thumbnail',
      values: {fileName: file.name},
    });
    return (
      <img
        className={cn(className, 'object-cover')}
        src={previewUrl}
        alt={alt}
        draggable={false}
      />
    );
  }
  return <FileTypeIcon className={iconClassName} type={file.type} />;
}
