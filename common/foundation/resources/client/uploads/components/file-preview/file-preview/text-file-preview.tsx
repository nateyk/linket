import {apiClient} from '@common/http/query-client';
import {useFileEntryUrls} from '@common/uploads/file-entry-urls';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {useEffect, useState} from 'react';
import {DefaultFilePreview} from './default-file-preview';
import {FilePreviewProps} from './file-preview-props';

const FIVE_MB = 5242880;

export function TextFilePreview(props: FilePreviewProps) {
  const {entry, className} = props;
  const [tooLarge, setTooLarge] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFailed, setIsFailed] = useState(false);
  const [contents, setContents] = useState<string | null>(null);
  const {previewUrl} = useFileEntryUrls(entry);

  useEffect(() => {
    if (!entry) return;
    if (!previewUrl) {
      setIsFailed(true);
    } else if (entry.file_size! >= FIVE_MB) {
      setTooLarge(true);
      setIsLoading(false);
    } else {
      getFileContents(previewUrl)
        .then(response => {
          setContents(response.data);
        })
        .catch(() => {
          setIsFailed(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [entry, previewUrl]);

  if (isLoading) {
    return <Spinner className="size-5" />;
  }

  if (tooLarge) {
    return (
      <DefaultFilePreview
        {...props}
        message={<Trans message="This file is too large to preview." />}
      />
    );
  }

  if (isFailed) {
    return (
      <DefaultFilePreview
        {...props}
        message={<Trans message="There was an issue previewing this file" />}
      />
    );
  }

  return (
    <pre
      className={cn(
        'mx-5 size-full overflow-y-auto rounded-card bg-background p-5 text-sm wrap-break-word whitespace-pre-wrap',
        className,
      )}
    >
      <div className="mx-auto max-w-6xl">{`${contents}`}</div>
    </pre>
  );
}

function getFileContents(src: string) {
  return apiClient.get(src, {
    responseType: 'text',
    // required for s3 presigned url to work
    withCredentials: false,
    headers: {
      Accept: 'text/plain',
    },
  });
}
