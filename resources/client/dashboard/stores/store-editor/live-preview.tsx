import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {PhonePreview} from '@app/dashboard/stores/store-editor/phone-preview';
import {
  PHONE_FRAME_ASPECT_RATIO,
  PHONE_GEOMETRY,
} from '@app/dashboard/stores/store-editor/phone-preview.constants';
import {
  PREVIEW_TAB_MESSAGE,
  StorePreviewEditorTab,
  StorePreviewSection,
} from '@app/dashboard/stores/store-editor/store-preview-protocol';
import {Button} from '@shadcn/button/button';
import {Drawer} from '@shadcn/drawer/drawer';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {SmartphoneIcon, XIcon} from 'lucide-react';
import {
  Activity,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useLocation} from 'react-router';

const PREVIEW_MESSAGE = 'linket:store-preview';
const PREVIEW_READY_MESSAGE = 'linket:store-preview-ready';

/**
 * Edits arrive one keystroke at a time; the frame only needs the latest
 * snapshot. Waiting a beat keeps a paste or a slider drag from queueing a
 * message per character.
 */
const SYNC_DEBOUNCE_MS = 150;

/**
 * The phone frame and its postMessage protocol. The stacked panel and the
 * sheet below lg each render their own instance; every instance streams the
 * same store snapshot into its own frame, so two frames never disagree.
 */
function PreviewDevice() {
  const {trans} = useTrans();
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const appearance = useBiolinkEditorStore(s => s.appearance);
  const content = useBiolinkEditorStore(s => s.content);
  const profileConfig = useBiolinkEditorStore(s => s.profileConfig);
  const openSection = useBiolinkEditorStore(s => s.openSection);

  const {pathname} = useLocation();
  const isInsightsTab = pathname.split('/').pop() === 'insights';

  // Which editor tab is mounted: the base path is Content, then /about and
  // /appearance. Insights has no preview mapping and posts nothing, so the
  // frame keeps whatever section it showed (A-06).
  const editorTab: StorePreviewEditorTab | null = useMemo(() => {
    if (isInsightsTab) return null;
    const last = pathname.split('/').pop() ?? '';
    if (last === 'about') return 'about';
    if (last === 'appearance') return 'appearance';
    return 'content';
  }, [pathname, isInsightsTab]);

  // Content = the preview's Profile section (unless the Products accordion
  // is open), About = About, Appearance = Profile.
  const previewSection: StorePreviewSection | null = useMemo(() => {
    if (editorTab === null) return null;
    if (editorTab === 'about') return 'about';
    if (editorTab === 'appearance') return 'profile';
    return openSection === 'products' ? 'products' : 'profile';
  }, [editorTab, openSection]);

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

  // Posted whenever the tab mapping changes — never on data syncs, so a
  // section tapped manually inside the preview survives edits (A-06).
  const tabMessage = useMemo(
    () =>
      editorTab && previewSection
        ? {
            type: PREVIEW_TAB_MESSAGE,
            activeTab: editorTab,
            section: previewSection,
          }
        : null,
    [editorTab, previewSection],
  );

  useEffect(() => {
    if (!tabMessage) return;
    iframeRef.current?.contentWindow?.postMessage(
      tabMessage,
      window.location.origin,
    );
  }, [tabMessage]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as {type?: string})?.type === PREVIEW_READY_MESSAGE) {
        // The frame just (re)loaded and has no draft yet: this one goes
        // straight through, or the preview would sit empty for the debounce.
        syncPreview();
        // Initial load must also land on the section of the current tab.
        if (tabMessage) {
          iframeRef.current?.contentWindow?.postMessage(
            tabMessage,
            window.location.origin,
          );
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [syncPreview, tabMessage]);

  const backHalf = biolink.back_half;

  return (
    // Fit the whole device inside whatever space is on offer.
    // `container-type: size` on this wrapper makes its height available
    // as `100cqh`, so the frame's width becomes whichever is smaller:
    // the container's width, or the width that fits the height on offer.
    // `aspect-ratio` then gives the height. Nothing scrolls and the
    // device is never cropped — the same rules in the panel and the sheet.
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
            title={trans({
              message: 'Live preview of the store page on an iPhone 14 Pro',
            })}
            width={PHONE_GEOMETRY.viewport.width}
            height={PHONE_GEOMETRY.viewport.height}
            scrolling="auto"
            className="block h-full w-full border-0 bg-background"
          />
        ) : null}
      </PhonePreview>
    </div>
  );
}

export function LivePreview() {
  const {pathname} = useLocation();
  const isInsightsTab = pathname.split('/').pop() === 'insights';
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Keep the mobile preview frame mounted after its first opening so
  // reopening the drawer preserves scroll position and draft state.
  const [drawerVisited, setDrawerVisited] = useState(false);

  // Insights has no preview: close its drawer before the trigger disappears.
  useEffect(() => {
    if (isInsightsTab) setDrawerOpen(false);
  }, [isInsightsTab]);

  return (
    <Activity>
      {/* Desktop uses a single persistent preview. With no redundant toolbar,
          the phone can take the full height of the sidebar. */}
      <div
        className={cn(
          'flex w-full min-w-0 shrink-0 flex-col overflow-hidden border-t bg-muted/30 px-2 py-3 lg:h-full lg:w-[min(36vw,28rem)] lg:min-w-88 lg:border-t-0 lg:border-l lg:border-border/60 lg:px-3 lg:py-4',
          'max-lg:hidden',
          isInsightsTab && 'hidden',
        )}
      >
        <h2 className="sr-only">
          <Trans message="Live preview" />
        </h2>
        <PreviewDevice />
      </div>

      {!isInsightsTab && (
        <Drawer.Root
          modal
          position="bottom"
          open={drawerOpen}
          onOpenChange={open => {
            setDrawerOpen(open);
            if (open) setDrawerVisited(true);
          }}
        >
          {/* Keep the trigger in the editor flow above mobile navigation. */}
          <div className="sticky bottom-0 z-20 border-t bg-background px-4 py-2.5 lg:hidden">
            <Drawer.Trigger
              render={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 w-full bg-background motion-reduce:transition-none"
                />
              }
            >
              <SmartphoneIcon />
              <Trans message="Preview" />
            </Drawer.Trigger>
          </div>

          <Drawer.Portal keepMounted={drawerVisited}>
            <Drawer.Backdrop />
            <Drawer.Content
              popupClassName="h-[min(94dvh,56rem)] max-h-none p-0"
              className="min-h-0 gap-0 overflow-hidden"
            >
              <Drawer.Header className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3 text-start">
                <Drawer.Title>
                  <Trans message="Live preview" />
                </Drawer.Title>
                <Drawer.Close
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close preview"
                    />
                  }
                >
                  <XIcon aria-hidden="true" />
                </Drawer.Close>
              </Drawer.Header>
              <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-[calc(.75rem+env(safe-area-inset-bottom,0px))]">
                <PreviewDevice />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

    </Activity>
  );
}
