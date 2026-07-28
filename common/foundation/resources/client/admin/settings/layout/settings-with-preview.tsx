import {AdminSettings} from '@common/admin/settings/admin-settings';
import {settingsPreviewPageId} from '@common/admin/settings/layout/settings-constants';
import {
  SettingsForm,
  SettingsPageHeader,
} from '@common/admin/settings/layout/settings-layout';
import {
  SettingsPageState,
  SettingsPageStoreProvider,
  useSettingsPageStore,
} from '@common/admin/settings/layout/settings-page-store';
import {listSettingsOptions} from '@common/admin/settings/settings-queries';
import {queryClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import clsx from 'clsx';
import {ChevronDownIcon, Maximize2Icon, Minimize2Icon} from 'lucide-react';
import {
  Fragment,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {UseFormReturn} from 'react-hook-form';
import {BlockerFunction} from 'react-router';

const PreviewSize = {
  real: {
    label: message('Actual size (100%)'),
    width: null,
  },
  desktop: {
    label: message('Desktop'),
    width: 1440,
  },
  tablet: {
    label: message('Tablet'),
    width: 768,
  },
  mobile: {
    label: message('Mobile'),
    width: 390,
  },
};

interface Props {
  children: [ReactElement<ContentProps>, ReactElement];
  title: ReactElement<MessageDescriptor>;
  gridCols?: string;
  allowNavigation?: BlockerFunction;
  defaultRoute?: SettingsPageState['previewRoute'];
  availableRoutes?: SettingsPageState['availableRoutes'];
  docsLink?: string;
}
export function SettingsWithPreview({
  title,
  children,
  gridCols,
  allowNavigation,
  defaultRoute,
  availableRoutes,
  docsLink,
}: Props) {
  return (
    <SettingsPageStoreProvider
      defaultRoute={defaultRoute}
      availableRoutes={availableRoutes}
    >
      <ExpandableContent>
        <div
          className={clsx(
            'grid h-full flex-auto grid-rows-[auto_auto_1fr] bg-background md:rounded-card md:border',
            gridCols ?? 'grid-cols-1 @5xl/with-preview:grid-cols-[auto_1fr]',
          )}
        >
          <SettingsPageHeader
            className="col-span-full row-[1/2]"
            title={title}
            allowNavigation={allowNavigation}
            docsLink={docsLink}
          />
          {children[0]}
          {children[1]}
        </div>
      </ExpandableContent>
    </SettingsPageStoreProvider>
  );
}

interface ExpandableContentProps {
  children: ReactNode;
}
function ExpandableContent({children}: ExpandableContentProps) {
  const isFullScreen = useSettingsPageStore(s => s.isFullScreen);
  return (
    <DashboardLayout.MainSection
      className={cn(
        '@container/with-preview h-full overflow-y-auto',
        isFullScreen && 'fixed inset-2',
      )}
    >
      {children}
    </DashboardLayout.MainSection>
  );
}

interface ContentProps {
  children: ReactNode;
  width?: string;
  className?: string;
}
function Content({children, width, className}: ContentProps) {
  return (
    <div
      className={cn(
        'compact-scrollbar @container/settings-form col-[1/2] row-[2/-1] h-full shrink-0 overflow-y-auto p-6',
        width ?? 'w-full @5xl/with-preview:w-110',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface FormProps {
  form: UseFormReturn<AdminSettings>;
  children: ReactNode;
  mergePreviewSettings?: boolean;
}
function Form({form, children, mergePreviewSettings}: FormProps) {
  const setValues = useSettingsPageStore(s => s.preview.setValues);

  useEffect(() => {
    // reset setting to the ones that are saved. This will happen
    // when navigating between different settings pages or tabs.
    const currentAdminSettings = queryClient.getQueryData<AdminSettings>(
      listSettingsOptions().queryKey,
    );
    if (currentAdminSettings) {
      setValues(currentAdminSettings, {merge: mergePreviewSettings});
    }

    // update settings in preview when any form value changes
    const subscription = form.watch(values => {
      setValues(values as AdminSettings, {merge: mergePreviewSettings});
    });
    return () => subscription.unsubscribe();
  }, [form, setValues, mergePreviewSettings]);

  return <SettingsForm form={form}>{children}</SettingsForm>;
}

function PreviewContainer() {
  const [selectedSize, setSelectedSize] =
    useState<keyof typeof PreviewSize>('desktop');

  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });

  const contentWidth = PreviewSize[selectedSize].width;
  const setIframeWindow = useSettingsPageStore(s => s.setIframeWindow);
  const [scaledContentHeight, setScaledContentHeight] = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerSize) return;

    const scaleFactor = contentWidth
      ? Math.min(containerSize.width / contentWidth, 1)
      : 1;
    const scaledHeight = containerSize.height / scaleFactor;
    setScaledContentHeight(scaledHeight);

    const newScale = contentWidth
      ? Math.min(containerSize.width / contentWidth, 1)
      : 1;

    setScale(newScale);
  }, [contentWidth, containerSize]);

  const src = useSettingsPreviewSrc();

  const rigisterContainerHeightObserver = useCallback((el: HTMLDivElement) => {
    if (!el) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerSize(entries[0].contentRect);
      }
    });

    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="col-[2/-1] row-[2/-1] hidden grid-rows-subgrid border-l @5xl/with-preview:grid">
      {src ? (
        <Fragment>
          <PreviewHeader size={selectedSize} onSizeChange={setSelectedSize} />
          <div className="col-span-full row-[2/-1] mx-6 mb-6 flex flex-col overflow-hidden rounded-card border">
            <PreviewToolbar src={src} />
            <div
              ref={rigisterContainerHeightObserver}
              className="height-container relative flex-auto bg-muted"
            >
              <div
                className="absolute right-0 left-0 mx-auto origin-top-left bg"
                style={{
                  width: contentWidth ? `${contentWidth}px` : '100%',
                  height: scaledContentHeight
                    ? `${scaledContentHeight}px`
                    : '100%',
                  transform: `scale(${scale})`,
                }}
              >
                <iframe
                  src={src}
                  className="h-full w-full shadow-sm"
                  ref={el => setIframeWindow(el?.contentWindow ?? null)}
                />
              </div>
            </div>
          </div>
        </Fragment>
      ) : (
        <div className="col-span-full row-[2/-1] m-auto rounded-card border px-7 py-3.5">
          <Trans message="No preview available" />
        </div>
      )}
    </div>
  );
}

export function useSettingsPreviewSrc(): string | null {
  const {base_url} = useSettings();
  const uri = useSettingsPageStore(s => s.previewRoute);

  // allow empty string or / as homepage
  if (uri == null) {
    return null;
  }

  const url = new URL(`${base_url}/${uri.replace(/^\//, '')}`);
  url.searchParams.set('settingsPreview', 'true');
  return url.toString();
}

interface PreviewHeaderProps {
  size?: keyof typeof PreviewSize;
  onSizeChange?: (size: keyof typeof PreviewSize) => void;
  padding?: string;
  className?: string;
}
function PreviewHeader({
  size,
  onSizeChange,
  padding,
  className,
}: PreviewHeaderProps) {
  const setPreviewRoute = useSettingsPageStore(s => s.setPreviewRoute);
  const activeRoute = useSettingsPageStore(s => s.previewRoute)!;
  const availableRoutes = Object.values(
    useSettingsPageStore(s => s.availableRoutes),
  );
  return (
    <div
      className={clsx(
        'col-span-full row-[1/2] flex items-center gap-3',
        padding ?? 'px-6 pt-6 pb-3',
        className,
      )}
    >
      {!!availableRoutes?.length && (
        <Dropdown.Root>
          <Dropdown.Trigger render={<Button variant="outline" size="sm" />}>
            <Trans
              {...availableRoutes.find(page => page.route === activeRoute)!
                .label}
            />
            <ChevronDownIcon data-icon="inline-end" />
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.RadioGroup
              value={activeRoute}
              onValueChange={value => setPreviewRoute(value)}
            >
              {availableRoutes.map(page => (
                <Dropdown.RadioItem key={page.route} value={page.route}>
                  <Trans {...page.label} />
                </Dropdown.RadioItem>
              ))}
            </Dropdown.RadioGroup>
          </Dropdown.Content>
        </Dropdown.Root>
      )}

      <div className="ml-auto w-0" />
      {!!onSizeChange && !!size && (
        <Dropdown.Root>
          <Dropdown.Trigger render={<Button variant="outline" size="sm" />}>
            <Trans {...PreviewSize[size].label} />
            <ChevronDownIcon data-icon="inline-end" />
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.RadioGroup
              value={size}
              onValueChange={value =>
                onSizeChange(value as keyof typeof PreviewSize)
              }
            >
              {Object.entries(PreviewSize).map(([value, item]) => (
                <Dropdown.RadioItem key={value} value={value}>
                  <Trans {...item.label} />
                </Dropdown.RadioItem>
              ))}
            </Dropdown.RadioGroup>
          </Dropdown.Content>
        </Dropdown.Root>
      )}
      <FullScreenToogleButton />
    </div>
  );
}

function FullScreenToogleButton() {
  const isFullScreen = useSettingsPageStore(s => s.isFullScreen);
  const setIsFullScreen = useSettingsPageStore(s => s.setIsFullScreen);
  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => setIsFullScreen(!isFullScreen)}
    >
      {isFullScreen ? <Maximize2Icon /> : <Minimize2Icon />}
    </Button>
  );
}

interface PreviewToolbarProps {
  src: string;
}
function PreviewToolbar({src}: PreviewToolbarProps) {
  const parts = new URL(src);
  // remove query params and protocol
  const previewUrl = `${parts.host}${parts.pathname !== '/' ? parts.pathname : ''}`;
  // remove query params only
  const previewSrc = `${parts.protocol}//${previewUrl}`;
  return (
    <div className="flex items-center gap-1 border-b px-3 py-2.5">
      <div className="mr-auto flex items-center gap-1">
        <div className="size-2 rounded-full bg-secondary" />
        <div className="size-2 rounded-full bg-secondary" />
        <div className="size-2 rounded-full bg-secondary" />
      </div>
      <a
        href={previewSrc}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          'mr-auto block max-w-96 flex-auto rounded-card border border-border/80 px-10 py-1 text-center text-xs text-muted-foreground hover:text-primary',
          previewSrc.includes(settingsPreviewPageId) && 'pointer-events-none',
        )}
      >
        {previewUrl}
      </a>
    </div>
  );
}

SettingsWithPreview.Preview = PreviewContainer;
SettingsWithPreview.PreviewHeader = PreviewHeader;
SettingsWithPreview.Content = Content;
SettingsWithPreview.Form = Form;
