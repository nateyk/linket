import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {PhonePreview} from '@app/dashboard/stores/store-editor/phone-preview';
import {
  PHONE_FRAME_ASPECT_RATIO,
  PHONE_GEOMETRY,
} from '@app/dashboard/stores/store-editor/phone-preview.constants';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {Activity, useCallback, useEffect, useRef} from 'react';
import {useLocation} from 'react-router';

const PREVIEW_MESSAGE = 'linket:store-preview';
const PREVIEW_READY_MESSAGE = 'linket:store-preview-ready';

/**
 * Edits arrive one keystroke at a time; the frame only needs the latest
 * snapshot. Waiting a beat keeps a paste or a slider drag from queueing a
 * message per character.
 */
const SYNC_DEBOUNCE_MS = 150;

export function LivePreview() {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const appearance = useBiolinkEditorStore(s => s.appearance);
  const content = useBiolinkEditorStore(s => s.content);
  const profileConfig = useBiolinkEditorStore(s => s.profileConfig);

  const {pathname} = useLocation();
  const isInsightsTab = pathname.split('/').pop() === 'insights';

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The frame is the real public route; drafts stream in over postMessage so
  // edits appear without reloading or flickering.
  const syncPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: PREVIEW_MESSAGE,
        payload: {biolink, appearance, content, profileConfig},
      },
      window.location.origin,
    );
  }, [biolink, appearance, content, profileConfig]);

  const scheduleSync = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(syncPreview, SYNC_DEBOUNCE_MS);
  }, [syncPreview]);

  useEffect(() => {
    scheduleSync();
    return () => clearTimeout(debounceRef.current);
  }, [scheduleSync]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as {type?: string})?.type === PREVIEW_READY_MESSAGE) {
        // The frame just (re)loaded and has no draft yet: this one goes
        // straight through, or the preview would sit empty for the debounce.
        syncPreview();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [syncPreview]);

  const backHalf = biolink.back_half;

  return (
    <Activity>
      {/* The panel is a fixed column on large screens and a stacked band on
          small ones. `h-full` plus `overflow-hidden` is what lets the frame
          below shrink to the space it has instead of running off the bottom. */}
      <div
        className={cn(
          'flex w-full min-w-0 shrink-0 flex-col items-center gap-2.5 overflow-hidden border-t bg-background px-4 py-5 lg:h-full lg:w-[min(36vw,28rem)] lg:min-w-88 lg:border-t-0 lg:border-l lg:px-6',
          isInsightsTab && 'hidden',
        )}
      >
        <div className="inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground shadow-xs select-none">
          <Trans message="Live preview" />
        </div>

        {/* Fit the whole device inside whatever is left of the panel.
            `container-type: size` on this wrapper makes its height available
            as `100cqh`, so the frame's width becomes whichever is smaller:
            the panel's width, or the width that fits the height on offer.
            `aspect-ratio` then gives the height. Nothing scrolls and the
            device is never cropped. */}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]">
          <PhonePreview
            style={{
              width: `min(100cqw, calc(100cqh * ${PHONE_FRAME_ASPECT_RATIO}))`,
            }}
          >
            {backHalf ? (
              <iframe
                ref={iframeRef}
                key={backHalf}
                src={`/${backHalf}?preview=1`}
                title="Live preview of the store page on an iPhone 14 Pro"
                width={PHONE_GEOMETRY.viewport.width}
                height={PHONE_GEOMETRY.viewport.height}
                scrolling="auto"
                className="block h-full w-full border-0 bg-background"
              />
            ) : null}
          </PhonePreview>
        </div>
      </div>
    </Activity>
  );
}