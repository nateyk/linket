// resources/client/dashboard/digital-products/product-preview.tsx
import {ProductCard} from '@app/digital-products/shared/product-card';
import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  ArchiveIcon,
  CheckIcon,
  Clock3Icon,
  FileIcon,
  PackageOpenIcon,
  PencilIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react';
import {useProductCreation} from './product-creation-context';
import type {ProductType} from './product-type-picker';

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  digital: 'Digital product',
  ebook: 'E-book',
  audio: 'Audio',
  course: 'Course',
};

export function formatPreviewPrice(price: string): string {
  const numericPrice = Number(price);
  return Number.isFinite(numericPrice)
    ? `ETB ${numericPrice.toFixed(2)}`
    : 'ETB 0.00';
}

export function ProductPreview() {
  const {
    state: {title, price, coverUrl, files, productType},
  } = useProductCreation();
  const {trans} = useTrans();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          <Trans message="Customer preview" />
        </p>
      </div>
      <ProductCard
        images={coverUrl ? [coverUrl] : []}
        title={title.trim() || trans({message: 'Your digital product'})}
        tags={[trans({message: PRODUCT_TYPE_LABELS[productType]})]}
        price={formatPreviewPrice(price)}
        meta={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileIcon className="size-4" aria-hidden="true" />
            <Trans
              message=":count download files"
              values={{count: files.length}}
            />
          </span>
        }
        action={
          <Tooltip.Root>
            <Tooltip.Trigger
              aria-label={trans({message: 'Preview only'})}
              render={
                <span className="inline-flex">
                  <Button disabled>
                    <Trans message="Buy now" />
                  </Button>
                </span>
              }
            >
              <FileIcon className="size-4" aria-hidden="true" />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <Trans message="Preview only — not purchasable yet" />
            </Tooltip.Content>
          </Tooltip.Root>
        }
        imageFallback={
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <PackageOpenIcon className="size-8" aria-hidden="true" />
            <span className="text-xs">
              <Trans message="Add a cover image" />
            </span>
          </div>
        }
      />
    </div>
  );
}

export function ProductStatus({status}: {status: string}) {
  const configs: Record<
    string,
    {icon: LucideIcon; tone: string; label: string}
  > = {
    draft: {
      icon: PencilIcon,
      tone: 'text-muted-foreground bg-muted',
      label: 'Draft',
    },
    pending_approval: {
      icon: Clock3Icon,
      tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
      label: 'In review',
    },
    approved: {
      icon: CheckIcon,
      tone: 'text-primary bg-primary/10',
      label: 'Approved',
    },
    rejected: {
      icon: TriangleAlertIcon,
      tone: 'text-destructive bg-destructive/10',
      label: 'Needs changes',
    },
    archived: {
      icon: ArchiveIcon,
      tone: 'text-muted-foreground bg-muted',
      label: 'Archived',
    },
  };
  const config = configs[status] ?? configs.draft;
  const Icon = config.icon;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label={config.label}
        render={
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-card-sm ${config.tone}`}
          />
        }
      >
        <Icon className="size-4" aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans message={config.label} />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
