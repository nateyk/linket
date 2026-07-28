import {FileEntry} from '@app/gen/schemas/file-entry';
import {FileThumbnail} from '@common/uploads/components/file-type-icon/file-thumbnail';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  XIcon,
} from 'lucide-react';
import {Fragment, ReactNode, useContext, useMemo} from 'react';
import {useFileEntryUrls} from '../../file-entry-urls';
import {getPreviewForEntry} from './available-previews';
import {FilePreviewContext} from './file-preview-context';

export interface FilePreviewContainerProps {
  entries: FileEntry[];
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  onClose?: () => void;
  showHeader?: boolean;
  headerActionsLeft?: ReactNode;
  className?: string;
  allowDownload?: boolean;
}
export function FilePreviewContainer({
  entries,
  onClose,
  showHeader = true,
  className,
  headerActionsLeft,
  allowDownload = true,
  ...props
}: FilePreviewContainerProps) {
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const [activeIndex, setActiveIndex] = useControlledState(
    props.activeIndex,
    props.defaultActiveIndex || 0,
    props.onActiveIndexChange,
  );

  const activeEntry = entries[activeIndex]!;
  const contextValue = useMemo(() => {
    return {entries, activeIndex};
  }, [entries, activeIndex]);
  const Preview = getPreviewForEntry(activeEntry);

  if (!activeEntry) {
    onClose?.();
    return null;
  }

  const canOpenNext = entries.length - 1 > activeIndex;
  const openNext = () => {
    setActiveIndex(activeIndex + 1);
  };
  const canOpenPrevious = activeIndex > 0;
  const openPrevious = () => {
    setActiveIndex(activeIndex - 1);
  };

  return (
    <FilePreviewContext.Provider value={contextValue}>
      {showHeader && (
        <Header
          actionsLeft={headerActionsLeft}
          isMobile={isMobile}
          onClose={onClose}
          onNext={canOpenNext ? openNext : undefined}
          onPrevious={canOpenPrevious ? openPrevious : undefined}
          allowDownload={allowDownload}
        />
      )}
      <div className={cn('relative flex-auto overflow-hidden', className)}>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon-lg"
            className="absolute top-1/2 left-0 z-10 -translate-y-1/2 transform text-muted-foreground"
            disabled={!canOpenPrevious}
            onClick={openPrevious}
          >
            <ChevronLeftIcon className="size-8" />
          </Button>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <Preview
            className="max-h-[calc(100%-30px)]"
            entry={activeEntry}
            allowDownload={allowDownload}
          />
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon-lg"
            className="absolute top-1/2 right-0 z-10 -translate-y-1/2 transform text-muted-foreground"
            disabled={!canOpenNext}
            onClick={openNext}
          >
            <ChevronRightIcon className="size-8" />
          </Button>
        )}
      </div>
    </FilePreviewContext.Provider>
  );
}

interface HeaderProps {
  onNext?: () => void;
  onPrevious?: () => void;
  onClose?: () => void;
  isMobile: boolean | null;
  actionsLeft?: ReactNode;
  allowDownload?: boolean;
}
function Header({
  onNext,
  onPrevious,
  onClose,
  isMobile,
  actionsLeft,
  allowDownload,
}: HeaderProps) {
  const {entries, activeIndex} = useContext(FilePreviewContext);
  const activeEntry = entries[activeIndex]!;
  const {downloadUrl} = useFileEntryUrls(activeEntry);

  if (!activeEntry) {
    return null;
  }

  const desktopDownloadButton = (
    <Button
      variant="ghost"
      onClick={() => {
        if (downloadUrl) {
          downloadFileFromUrl(downloadUrl);
        }
      }}
    >
      <DownloadIcon />
      <Trans message="Download" />
    </Button>
  );

  const mobileDownloadButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        if (downloadUrl) {
          downloadFileFromUrl(downloadUrl);
        }
      }}
    >
      <DownloadIcon />
    </Button>
  );

  const downloadButton = isMobile
    ? mobileDownloadButton
    : desktopDownloadButton;

  return (
    <div className="flex min-h-12.5 shrink-0 items-center justify-between gap-5 border-b bg-background px-2.5 text-sm text-muted-foreground">
      <div className="flex w-1/3 items-center justify-start gap-1">
        {actionsLeft}
        {allowDownload ? downloadButton : undefined}
      </div>
      <div className="flex w-1/3 flex-nowrap items-center justify-center gap-2.5 text-foreground">
        <FileThumbnail
          file={activeEntry}
          iconClassName="w-4 h-4"
          showImage={false}
        />
        <div className="overflow-hidden text-ellipsis whitespace-nowrap">
          {activeEntry.name}
        </div>
      </div>
      <div className="flex w-1/3 items-center justify-end gap-2.5 whitespace-nowrap">
        {!isMobile && (
          <Fragment>
            <Button
              variant="ghost"
              size="icon"
              disabled={!onPrevious}
              onClick={onPrevious}
            >
              <ChevronLeftIcon />
            </Button>
            <div>{activeIndex + 1}</div>
            <div>/</div>
            <div>{entries.length}</div>
            <Button
              variant="ghost"
              size="icon"
              disabled={!onNext}
              onClick={onNext}
            >
              <ChevronRightIcon />
            </Button>
            <div className="mx-5 h-6 w-px bg-border" />
          </Fragment>
        )}
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
