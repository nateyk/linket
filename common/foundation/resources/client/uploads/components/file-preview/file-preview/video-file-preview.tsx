import {useEffect, useRef, useState} from 'react';
import {useFileEntryUrls} from '../../../file-entry-urls';
import {DefaultFilePreview} from './default-file-preview';
import {FilePreviewProps} from './file-preview-props';

export function VideoFilePreview(props: FilePreviewProps) {
  const {entry, className} = props;
  const {previewUrl} = useFileEntryUrls(entry);
  const ref = useRef<HTMLVideoElement>(null);
  const [mediaInvalid, setMediaInvalid] = useState(false);

  useEffect(() => {
    setMediaInvalid(!entry.mime || !ref.current?.canPlayType(entry.mime));
  }, [entry]);

  if (mediaInvalid || !previewUrl) {
    return <DefaultFilePreview {...props} />;
  }

  return (
    <video
      className={className}
      ref={ref}
      controls
      controlsList="nodownload noremoteplayback"
      playsInline
      autoPlay
    >
      <source
        src={previewUrl}
        type={entry.mime ?? undefined}
        onError={() => {
          setMediaInvalid(true);
        }}
      />
    </video>
  );
}
