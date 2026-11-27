import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {resolveBiolinkContainerRadius} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {buttonVariants} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {
  PdfViewer,
  PdfViewerContent,
  PdfViewerToolbar,
} from '@shadcn/pdf-viewer';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {ExternalLinkIcon, FileTextIcon} from 'lucide-react';
import type {PublicProductSample} from '../digital-product-public-pages';
import {biolinkSurfaceCard} from './surface';

/**
 * Renders the storefront PDF sample preview inside an Appearance-themed
 * surface card with custom pagination, zoom, and fallback actions.
 */
export function ProductSamplePdf({
  sample,
  appearance,
}: {
  sample: PublicProductSample;
  appearance?: BiolinkAppearanceConfig | null;
}) {
  const containerRadius = resolveBiolinkContainerRadius(appearance);

  return (
    <Card.Root className={cn(biolinkSurfaceCard, containerRadius.className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-button border border-[var(--biolink-border)] bg-[var(--biolink-surface-muted)] text-[var(--biolink-text)]"
          >
            <FileTextIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--biolink-text)]">
              <Trans message="Sample pages" />
            </h2>
            {sample.title && (
              <p className="truncate text-xs text-[var(--biolink-muted-text)]">
                {sample.title}
              </p>
            )}
          </div>
        </div>
        <a
          data-slot="button"
          href={sample.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            buttonVariants({variant: 'outline', size: 'sm'}),
            'rounded-button border-[var(--biolink-border)] bg-[var(--biolink-surface)] text-[var(--biolink-text)] hover:border-[var(--biolink-border)] hover:bg-[var(--biolink-surface-muted)]',
          )}
        >
          <ExternalLinkIcon aria-hidden="true" />
          <Trans message="Open sample" />
        </a>
      </div>

      <PdfViewer
        file={sample.url}
        className="h-[28rem] rounded-none border-0 bg-transparent text-[var(--biolink-text)] sm:h-[34rem]"
      >
        <PdfViewerToolbar
          className={cn(
            'border-t border-b border-[var(--biolink-border)] bg-[var(--biolink-surface)] px-3 py-1.5 text-[var(--biolink-text)] sm:px-4',
            '[&_a]:rounded-button [&_a]:text-[var(--biolink-text)] [&_a:hover]:bg-[var(--biolink-surface-muted)]',
            '[&_button]:rounded-button [&_button]:text-[var(--biolink-text)] [&_button:hover]:bg-[var(--biolink-surface-muted)]',
            '[&_input]:rounded-input [&_input]:border-[var(--biolink-border)] [&_input]:bg-[var(--biolink-surface-strong)] [&_input]:text-[var(--biolink-text)]',
            '[&_span]:text-[var(--biolink-muted-text)]',
          )}
        />
        <PdfViewerContent
          className="bg-[var(--biolink-surface-muted)] p-3 sm:p-5"
          errorFallback={
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-[var(--biolink-muted-text)]">
                <Trans message="This PDF could not be opened inline." />
              </p>
              <a
                data-slot="button"
                href={sample.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({variant: 'outline', size: 'sm'}),
                  'rounded-button border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] hover:border-[var(--biolink-border)] hover:bg-[var(--biolink-surface)]',
                )}
              >
                <ExternalLinkIcon aria-hidden="true" />
                <Trans message="Open sample" />
              </a>
            </div>
          }
        />
      </PdfViewer>
    </Card.Root>
  );
}
