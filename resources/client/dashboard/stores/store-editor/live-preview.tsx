import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {PhonePreview} from '@app/dashboard/stores/store-editor/phone-preview';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {Activity, useCallback, useEffect, useRef} from 'react';
import {useLocation} from 'react-router';

const PREVIEW_MESSAGE = 'linket:store-preview';
const PREVIEW_READY_MESSAGE = 'linket:store-preview-ready';

export function LivePreview() {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const appearance = useBiolinkEditorStore(s => s.appearance);
  const content = useBiolinkEditorStore(s => s.content);
  const profileConfig = useBiolinkEditorStore(s => s.profileConfig);

  const {pathname} = useLocation();
  const isInsightsTab = pathname.split('/').pop() === 'insights';

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The frame is the real public route; drafts stream in over
  // postMessage so edits appear without reloading or flickering.
  const syncPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: PREVIEW_MESSAGE,
        payload: {biolink, appearance, content, profileConfig},
      },
      window.location.origin,
    );
  }, [biolink, appearance, content, profileConfig]);

  useEffect(() => {
    syncPreview();
  }, [syncPreview]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as {type?: string})?.type === PREVIEW_READY_MESSAGE) {
        syncPreview();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [syncPreview]);

  const backHalf = biolink.back_half;

  return (
    <Activity>
      <div
        className={cn(
          'flex w-full min-w-0 shrink-0 flex-col items-center overflow-x-hidden border-t bg-background px-4 py-5 lg:w-[min(36vw,28rem)] lg:min-w-88 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:px-6 lg:py-5',
          isInsightsTab && 'hidden',
        )}
      >
        <div className="mb-2.5 inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground shadow-xs select-none">
          <Trans message="Live preview" />
        </div>
        <PhonePreview className="w-full max-w-64 sm:max-w-72 lg:max-w-76">
          {backHalf ? (
            <iframe
              ref={iframeRef}
              key={backHalf}
              src={`/${backHalf}?preview=1`}
              title="Live preview"
              width={393}
              height={852}
              className="block border-0 bg-background"
              onLoad={syncPreview}
            />
          ) : null}
        </PhonePreview>
      </div>
    </Activity>
  );
}
