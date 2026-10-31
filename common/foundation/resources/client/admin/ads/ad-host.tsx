import {Settings} from '@ui/settings/settings';
import {useSettings} from '@ui/settings/use-settings';
import clsx from 'clsx';
import {pickNestedValue} from '@ui/utils/pick-nested-value';
import {memo, useMemo} from 'react';
import {useAuth} from '../../auth/use-auth';

interface AdHostProps {
  slot: keyof Omit<NonNullable<Settings['ads']>, 'disable'>;
  className?: string;
}
export function AdHost({slot, className}: AdHostProps) {
  const settings = useSettings();
  const {isSubscribed} = useAuth();
  const adCode = useMemo(() => {
    return pickNestedValue<string>(`ads.${slot}`, settings);
  }, [slot, settings]);

  if (settings.ads?.disable || isSubscribed || !adCode) return null;

  return <SandboxedAd className={className} slot={slot} adCode={adCode} />;
}

interface SandboxedAdProps {
  slot: string;
  adCode: string;
  className?: string;
}

// Ad snippets are intentionally isolated from the Linket document. In particular,
// omitting allow-same-origin prevents them from reading application storage or DOM.
const SandboxedAd = memo(({slot, adCode, className}: SandboxedAdProps) => (
  <iframe
    className={clsx(
      'ad-host max-h-150 min-h-22.5 w-full max-w-full shrink-0 overflow-hidden border-0',
      `${slot.replace(/\./g, '-')}-host`,
      className,
    )}
    loading="lazy"
    referrerPolicy="no-referrer"
    sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts"
    srcDoc={adCode}
    title={`Advertisement: ${slot}`}
  />
));
