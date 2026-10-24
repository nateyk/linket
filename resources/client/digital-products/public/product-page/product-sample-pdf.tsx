import {Button} from '@shadcn/button/button';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ExternalLinkIcon} from 'lucide-react';
import type {PublicProductSample} from '../digital-product-public-pages';
import {biolinkSurfaceCard} from './surface';

export function ProductSamplePdf({sample}: {sample: PublicProductSample}) {
  const {trans} = useTrans();

  return (
    <div className={biolinkSurfaceCard}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">
          <Trans message="Sample pages" />
        </h2>
        <Button
          variant="outline"
          size="sm"
          render={
            <a href={sample.url} target="_blank" rel="noreferrer" />
          }
        >
          <ExternalLinkIcon aria-hidden="true" />
          <Trans message="Open sample" />
        </Button>
      </div>
      <iframe
        title={trans(message('Sample PDF'))}
        src={sample.url}
        className="h-80 w-full border-t border-[var(--biolink-border)] bg-[var(--biolink-surface)] sm:h-[28rem]"
      />
    </div>
  );
}
