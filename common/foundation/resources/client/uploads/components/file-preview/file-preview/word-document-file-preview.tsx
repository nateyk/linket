import {addPreviewToken} from '@app/gen/files';
import {Spinner} from '@shadcn/spinner/spinner';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {useEffect, useRef, useState} from 'react';
import {useFileEntryUrls} from '../../../file-entry-urls';
import {DefaultFilePreview} from './default-file-preview';
import {FilePreviewProps} from './file-preview-props';

export function WordDocumentFilePreview(props: FilePreviewProps) {
  const {entry, className} = props;
  const {trans} = useTrans();
  const ref = useRef<HTMLIFrameElement>(null);
  const [showDefault, setShowDefault] = useState(false);
  const timeoutId = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {previewUrl} = useFileEntryUrls(entry);

  useEffect(() => {
    // Google Docs viewer only supports files up to 25MB
    if (!previewUrl) {
      setShowDefault(true);
    } else if (entry.file_size && entry.file_size > 25000000) {
      setShowDefault(true);
    } else if (ref.current) {
      ref.current.onload = () => {
        clearTimeout(timeoutId.current);
        setIsLoading(false);
      };

      buildPreviewUrl(previewUrl, entry).then(url => {
        if (ref.current) {
          ref.current.src = url;
        }
      });

      // if preview iframe is not loaded
      // after 5 seconds, bail and show default preview
      timeoutId.current = setTimeout(() => {
        setShowDefault(true);
      }, 5000);
    }
  }, [entry, previewUrl]);

  if (showDefault) {
    return <DefaultFilePreview {...props} />;
  }

  return (
    <div className={cn(className, 'mx-5 size-full rounded-card bg-background')}>
      {isLoading ? (
        <div className="flex size-full items-center justify-center">
          <Spinner className="size-5" />
        </div>
      ) : (
        <iframe
          ref={ref}
          title={trans({
            message: 'Preview for :name',
            values: {name: entry.name},
          })}
          className={cn('size-full', isLoading && 'hidden')}
        />
      )}
    </div>
  );
}

async function buildPreviewUrl(
  urlString: string,
  entry: {id: number},
): Promise<string> {
  const url = new URL(urlString);
  // if we're not trying to preview shareable link we will need to generate
  // preview token, otherwise it won't be publicly accessible
  if (!url.searchParams.has('shareable_link')) {
    const {preview_token} = await addPreviewToken(entry.id);
    url.searchParams.append('preview_token', preview_token);
  }

  return buildOfficeLivePreviewUrl(url);
}

function buildOfficeLivePreviewUrl(url: URL) {
  // https://docs.google.com/gview?embedded=true&url=
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    url.toString(),
  )}`;
}
