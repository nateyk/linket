import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {useFileEntryUrls} from '../../../file-entry-urls';
import {DefaultFilePreview} from './default-file-preview';
import {FilePreviewProps} from './file-preview-props';

export function ImageFilePreview(props: FilePreviewProps) {
  const {entry, className} = props;
  const {trans} = useTrans();
  const {previewUrl} = useFileEntryUrls(entry);

  if (!previewUrl) {
    return <DefaultFilePreview {...props} />;
  }

  return (
    <img
      className={cn(className, 'shadow-sm')}
      src={previewUrl}
      alt={trans({
        message: 'Preview for :name',
        values: {name: entry.name},
      })}
    />
  );
}
