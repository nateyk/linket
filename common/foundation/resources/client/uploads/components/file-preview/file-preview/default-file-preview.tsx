import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {ReactNode, useContext} from 'react';
import {useFileEntryUrls} from '../../../file-entry-urls';
import {FilePreviewContext} from '../file-preview-context';
import {FilePreviewProps} from './file-preview-props';

interface Props extends FilePreviewProps {
  message?: ReactNode;
}
export function DefaultFilePreview({message, className, allowDownload}: Props) {
  const {entries, activeIndex} = useContext(FilePreviewContext);
  const activeEntry = entries[activeIndex];
  const content = message || <Trans message="No file preview available" />;
  const {downloadUrl} = useFileEntryUrls(activeEntry);
  return (
    <div
      className={cn(
        className,
        'w-[calc(100%-40px)] max-w-100 rounded-card bg-background p-10 text-center shadow-sm',
      )}
    >
      <div className="text-lg">{content}</div>
      {allowDownload && (
        <div className="mt-5 block text-center">
          <Button
            variant="default"
            color="primary"
            onClick={() => {
              if (downloadUrl) {
                downloadFileFromUrl(downloadUrl);
              }
            }}
          >
            <Trans message="Download" />
          </Button>
        </div>
      )}
    </div>
  );
}
