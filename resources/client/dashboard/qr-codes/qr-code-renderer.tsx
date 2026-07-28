import {buildQrCodeUrl} from '@app/dashboard/qr-codes/build-qr-code-url';
import {QrCode} from '@app/gen/schemas/qr-code';
import {Spinner} from '@shadcn/spinner/spinner';
import {useSettings} from '@ui/settings/use-settings';
import {shallowEqual} from '@ui/utils/shallow-equal';
import {nanoid} from 'nanoid';
import {Options} from 'qr-code-styling';
import {memo, useEffect, useMemo, useRef, useState} from 'react';
import {urlIsValid} from '../links/utils/url-is-valid';

type QrCodeProps = {
  url: string;
  size?: number;
  className?: string;
  style?: QrCode['style'];
};

export const QrCodeRenderer = memo(function QrCode({
  url,
  size = 200,
  className,
  style,
}: QrCodeProps) {
  const {base_url} = useSettings();
  const resolvedUrl = useMemo(
    () => (urlIsValid(url) ? url : base_url),
    [url, base_url],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<InstanceType<
    typeof import('qr-code-styling').default
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const options = buildQrCodeOptions({
      url: resolvedUrl,
      size,
      style,
    });

    if (qrCodeRef.current) {
      qrCodeRef.current.update(options);
      return;
    }

    createQrCode(options).then(qrCode => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = '';
      qrCode.append(containerRef.current);
      qrCodeRef.current = qrCode;
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedUrl, size, style]);

  return (
    <div className={className}>
      {isLoading && (
        <div
          className="flex items-center justify-center"
          style={{width: size, height: size}}
        >
          <Spinner />
        </div>
      )}
      <div ref={containerRef} className={isLoading ? 'hidden' : undefined} />
    </div>
  );
}, shallowEqual);

async function createQrCode(options: Options) {
  const {default: QRCodeStyling} = await import('qr-code-styling');
  return new QRCodeStyling(options);
}

type BuildQrCodeProps = {
  url: string;
  size?: number;
  style?: QrCode['style'];
};
function buildQrCodeOptions({url, size, style}: BuildQrCodeProps): Options {
  const options: Options = {
    width: size ?? 200,
    height: size ?? 200,
    type: 'svg',
    data: url,
    image: style?.showLogo ? (style?.logoUrl ?? undefined) : undefined,
    dotsOptions: {
      type: 'rounded',
      color: style?.color ?? '#000000',
    },
    backgroundOptions: {
      color: style?.bgColor ?? '#ffffff',
    },
  };

  if (style?.logoUrl) {
    options.imageOptions = {
      crossOrigin: 'anonymous',
      margin: 4,
    };
  }

  return options;
}

type DownloadQrCodeProps = {
  qrCode: {
    back_half: string;
    style?: QrCode['style'];
  };
  size?: number;
  extension?: 'svg' | 'png' | 'jpeg' | 'webp';
};
export async function downloadQrCode(props: DownloadQrCodeProps) {
  const qrCode = await createQrCode(
    buildQrCodeOptions({
      url: buildQrCodeUrl(props.qrCode),
      size: props.size,
      style: props.qrCode.style,
    }),
  );
  qrCode.download({name: `${nanoid()}`, extension: props.extension});
}
