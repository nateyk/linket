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
import {Dialog} from '@shadcn/dialog/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@shadcn/sheet/sheet';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {Maximize2Icon, SmartphoneIcon, XIcon} from 'lucide-react';
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  // True once the sheet has been opened: its frame then stays mounted
  // behind the hidden popup instead of being torn down and rebuilt.
  const [sheetVisited, setSheetVisited] = useState(false);

  // Insights hides the panel and its trigger; an open sheet must go with
  // them, or returning could resurrect a modal whose trigger never came back.
  useEffect(() => {
    if (isInsightsTab) {
      setSheetOpen(false);
      setExpandedOpen(false);
    }
  }, [isInsightsTab]);

  return (
    <Activity>
      {/* On large screens the panel is a fixed column. Below lg it is hidden
          but stays mounted — frame and A-05/A-06 state intact — while the
          footer trigger and sheet take over, so Preview stays reachable without
          covering long-form controls (A-19). `h-full` plus `overflow-hidden`
          is what lets the frame shrink to the space it has instead of
          running off the bottom. */}
      <div
        className={cn(
          'flex w-full min-w-0 shrink-0 flex-col items-center gap-2.5 overflow-hidden border-t bg-muted/30 px-4 py-5 lg:h-full lg:w-[min(36vw,28rem)] lg:min-w-88 lg:border-t-0 lg:border-l lg:border-border/60 lg:px-6',
          'max-lg:hidden',
          isInsightsTab && 'hidden',
        )}
      >
        <div className="flex w-full shrink-0 items-center justify-between gap-3">
          <span className="inline-flex h-6 items-center rounded-full border border-border/60 bg-background px-2.5 text-xs font-medium text-muted-foreground select-none">
            <Trans message="Live preview" />
          </span>
          <Dialog.Root open={expandedOpen} onOpenChange={setExpandedOpen}>
            <Dialog.Trigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9"
                />
              }
            >
              <Maximize2Icon data-icon="inline-start" aria-hidden="true" />
              <Trans message="Expand preview" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop />
              <Dialog.Content
                aria-modal="true"
                className="h-[min(92dvh,56rem)] w-[min(96vw,56rem)] max-w-none sm:max-w-none"
              >
                <Dialog.Header className="flex-row items-center justify-between gap-3">
                  <Dialog.Title>
                    <Trans message="Expanded live preview" />
                  </Dialog.Title>
                  <Dialog.CloseButton
                    render={<Button type="button" size="icon-sm" variant="ghost" />}
                  >
                    <XIcon aria-hidden="true" />
                    <span className="sr-only">
                      <Trans message="Close preview" />
                    </span>
                  </Dialog.CloseButton>
                </Dialog.Header>
                <Dialog.Body className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <PreviewDevice />
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        <PreviewDevice />
      </div>

      {!isInsightsTab && (
        <>
          {/* Keep Preview in the editor flow on compact layouts. The app shell
              renders mobile navigation after dashboard content, so this sticky
              footer naturally sits immediately above it without hard-coded nav
              offsets or covering the editor's last controls. */}
          <div className="sticky bottom-0 z-20 border-t bg-background px-4 py-2.5 lg:hidden">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              className="min-h-11 w-full bg-background motion-reduce:transition-none"
              onClick={() => {
                setSheetVisited(true);
                setSheetOpen(true);
              }}
            >
              <SmartphoneIcon />
              <Trans message="Preview" />
            </Button>
          </div>

          {/* A modal bottom sheet: focus is trapped, Esc closes, focus
              returns to the trigger. The frame mounts on first open and
              then stays mounted (keepMounted) for cheap reopens. */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent
              side="bottom"
              keepMounted={sheetVisited}
              aria-modal="true"
              className="h-[min(88dvh,46rem)]"
            >
              <SheetHeader className="flex-row items-center justify-between gap-2 border-b px-4 py-3">
                <SheetTitle>
                  <Trans message="Live preview" />
                </SheetTitle>
                <Dialog.CloseButton
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <XIcon />
                  <span className="sr-only">
                    <Trans message="Close" />
                  </span>
                </Dialog.CloseButton>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col p-4 pb-[calc(1rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))]">
                <PreviewDevice />
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </Activity>
  );
}
