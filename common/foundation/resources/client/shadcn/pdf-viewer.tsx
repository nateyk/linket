import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import {Button, buttonVariants} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Separator} from '@shadcn/separator';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  Maximize2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react';
import defaultWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as React from 'react';

type ReactPdf = typeof import('react-pdf');

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export interface PdfViewerLabels {
  previous: string;
  next: string;
  page: string;
  of: string;
  zoomIn: string;
  zoomOut: string;
  fitWidth: string;
  download: string;
  error: string;
}

interface PdfViewerContextValue {
  file: string;
  lib: ReactPdf | null;
  page: number;
  setPage: (page: number) => void;
  pages: number;
  setPages: (pages: number) => void;
  /** 1 fits the page to the width of the viewer. */
  zoom: number;
  setZoom: (zoom: number) => void;
  labels: PdfViewerLabels;
}

const PdfViewerContext = React.createContext<PdfViewerContextValue | null>(
  null,
);

/** Accesses state and actions for the enclosing `<PdfViewer>`. */
const usePdfViewer = () => {
  const ctx = React.useContext(PdfViewerContext);
  if (!ctx) {
    throw new Error('PdfViewer compound parts must be used inside <PdfViewer>');
  }

  return ctx;
};

export interface PdfViewerProps extends React.ComponentProps<'div'> {
  /** URL of the PDF. It must be served from the origin or with CORS. */
  file: string;
  /** Page shown first, starting at 1. */
  defaultPage?: number;
  /** Overrides the bundled `pdfjs-dist` worker URL when needed. */
  workerUrl?: string;
  labels?: Partial<PdfViewerLabels>;
}

/**
 * Compound PDF viewer powered by `react-pdf` with pagination, zoom controls,
 * keyboard page turns, and direct file download.
 */
const PdfViewer = ({
  file,
  defaultPage = 1,
  workerUrl,
  labels,
  className,
  children,
  ...props
}: PdfViewerProps) => {
  const {trans} = useTrans();
  const [lib, setLib] = React.useState<ReactPdf | null>(null);
  const [page, setPage] = React.useState(defaultPage);
  const [pages, setPages] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [prevFile, setPrevFile] = React.useState(file);
  if (prevFile !== file) {
    setPrevFile(file);
    setPage(defaultPage);
    setPages(0);
  }

  const defaultLabels = React.useMemo<PdfViewerLabels>(
    () => ({
      previous: trans(message('Previous page')),
      next: trans(message('Next page')),
      page: trans(message('Page')),
      of: trans(message('of')),
      zoomIn: trans(message('Zoom in')),
      zoomOut: trans(message('Zoom out')),
      fitWidth: trans(message('Fit to width')),
      download: trans(message('Download')),
      error: trans(message('This PDF could not be opened.')),
    }),
    [trans],
  );

  // pdf.js needs browser APIs at import time, so it loads after mount.
  React.useEffect(() => {
    let cancelled = false;
    void import('react-pdf').then(mod => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = workerUrl ?? defaultWorkerUrl;
      if (!cancelled) setLib(mod);
    });

    return () => {
      cancelled = true;
    };
  }, [workerUrl]);

  const ctx = React.useMemo<PdfViewerContextValue>(
    () => ({
      file,
      lib,
      page,
      setPage: next =>
        setPage(Math.min(Math.max(1, next), pages || Number.MAX_SAFE_INTEGER)),
      pages,
      // Clamp once page count arrives in case `defaultPage` exceeded the PDF.
      setPages: count => {
        setPages(count);
        setPage(current =>
          Math.min(Math.max(1, current), Math.max(1, count)),
        );
      },
      zoom,
      setZoom,
      labels: {...defaultLabels, ...labels},
    }),
    [file, lib, page, pages, zoom, defaultLabels, labels],
  );

  return (
    <PdfViewerContext.Provider value={ctx}>
      <div
        data-slot="pdf-viewer"
        className={cn(
          'flex h-[36rem] flex-col overflow-hidden rounded-card border border-border bg-card',
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <PdfViewerToolbar />
            <PdfViewerContent />
          </>
        )}
      </div>
    </PdfViewerContext.Provider>
  );
};

/** Page arrows and number, zoom controls, fit to width, and download link. */
const PdfViewerToolbar = ({
  className,
  ...props
}: React.ComponentProps<'div'>) => {
  const {file, page, setPage, pages, zoom, setZoom, labels} = usePdfViewer();
  const [draft, setDraft] = React.useState<string | null>(null);
  const matchedZoomIndex = ZOOM_STEPS.findIndex(step => step >= zoom - 0.001);
  const zoomIndex =
    matchedZoomIndex === -1 ? ZOOM_STEPS.length - 1 : matchedZoomIndex;

  const commitDraft = () => {
    if (draft !== null) setPage(Number(draft) || page);
    setDraft(null);
  };

  return (
    <div
      data-slot="pdf-viewer-toolbar"
      className={cn(
        'flex flex-wrap items-center gap-1 border-b border-border px-2.5 py-1.5',
        className,
      )}
      {...props}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={labels.previous}
        title={labels.previous}
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        <ChevronLeftIcon aria-hidden="true" className="rtl:rotate-180" />
      </Button>
      <form
        className="flex items-center gap-1.5 text-sm"
        onSubmit={event => {
          event.preventDefault();
          commitDraft();
        }}
      >
        <Input
          bindToHookForm={false}
          aria-label={labels.page}
          inputMode="numeric"
          value={draft ?? String(page)}
          onChange={event => setDraft(event.target.value.replace(/\D/g, ''))}
          onBlur={commitDraft}
          className="h-8 w-12 px-2 text-center tabular-nums"
        />
        <span className="text-muted-foreground tabular-nums">
          {labels.of} {pages || '–'}
        </span>
      </form>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={labels.next}
        title={labels.next}
        disabled={!pages || page >= pages}
        onClick={() => setPage(page + 1)}
      >
        <ChevronRightIcon aria-hidden="true" className="rtl:rotate-180" />
      </Button>
      <Separator
        orientation="vertical"
        className="mx-1 data-[orientation=vertical]:h-5"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={labels.zoomOut}
        title={labels.zoomOut}
        disabled={zoomIndex <= 0}
        onClick={() => setZoom(ZOOM_STEPS[Math.max(0, zoomIndex - 1)])}
      >
        <ZoomOutIcon aria-hidden="true" />
      </Button>
      <span className="w-12 text-center text-sm text-muted-foreground tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={labels.zoomIn}
        title={labels.zoomIn}
        disabled={zoomIndex >= ZOOM_STEPS.length - 1}
        onClick={() =>
          setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1)])
        }
      >
        <ZoomInIcon aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={labels.fitWidth}
        title={labels.fitWidth}
        disabled={zoom === 1}
        onClick={() => setZoom(1)}
      >
        <Maximize2Icon aria-hidden="true" />
      </Button>
      <a
        data-slot="button"
        href={file}
        download
        aria-label={labels.download}
        title={labels.download}
        className={cn(buttonVariants({variant: 'ghost', size: 'icon-sm'}), 'ms-auto')}
      >
        <DownloadIcon aria-hidden="true" />
      </a>
    </div>
  );
};

export interface PdfViewerContentProps extends React.ComponentProps<'div'> {
  /** Custom fallback displayed when the PDF cannot be opened. */
  errorFallback?: React.ReactNode;
}

/**
 * Scrollable PDF page stage sized to container width. Arrow and Page keys turn pages.
 */
const PdfViewerContent = ({
  className,
  errorFallback,
  ...props
}: PdfViewerContentProps) => {
  const {file, lib, page, setPage, pages, setPages, zoom, labels} =
    usePdfViewer();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const initialWidth = Math.floor(el.clientWidth);
    if (initialWidth > 0) {
      setWidth(initialWidth);
    }

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const placeholder = (
    <Skeleton className="mx-auto aspect-[1/1.294] w-full max-w-full" />
  );

  const ariaLabel = pages
    ? `${labels.page} ${page} ${labels.of} ${pages}`
    : labels.page;

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      data-slot="pdf-viewer-content"
      onKeyDown={event => {
        const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
        if (
          event.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ||
          event.key === 'PageDown'
        ) {
          setPage(page + 1);
        } else if (
          event.key === (rtl ? 'ArrowRight' : 'ArrowLeft') ||
          event.key === 'PageUp'
        ) {
          setPage(page - 1);
        } else {
          return;
        }
        event.preventDefault();
      }}
      className={cn(
        'min-h-0 flex-1 overflow-auto bg-muted/50 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset',
        className,
      )}
      {...props}
    >
      {!lib || width === 0 ? (
        placeholder
      ) : (
        <lib.Document
          file={file}
          loading={placeholder}
          error={
            errorFallback ?? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {labels.error}
              </p>
            )
          }
          onLoadSuccess={doc => setPages(doc.numPages)}
          className="flex justify-center-safe"
        >
          <lib.Page
            pageNumber={page}
            width={width * zoom}
            loading={placeholder}
            className="overflow-hidden rounded-sm shadow-md"
          />
        </lib.Document>
      )}
    </div>
  );
};

export {PdfViewer, PdfViewerToolbar, PdfViewerContent, usePdfViewer};

export default PdfViewer;
