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
  TypeIcon,
  type LucideIcon,
} from 'lucide-react';
import type {ReactNode} from 'react';
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

export type ProductFormCustomerPreviewProps = {
  title: string;
  /** Static <Trans> message for the empty-title placeholder. */
  emptyTitle: string;
  /** Already-formatted price label (e.g. "ETB 10.00" or "Free"). */
  price: ReactNode;
  productType: ProductType;
  coverUrl?: string;
  /**
   * Optional body copy on the card (course setup). Digital edit keeps the
   * description off the card and only uses `descriptionLength` in meta.
   */
  description?: string | null;
  /** Raw length for the character meta row (digital edit). */
  descriptionLength?: number;
  /** When set, shows the download-file meta row (digital/ebook/audio). */
  fileCount?: number;
  imageFallback?: ReactNode;
};

/**
 * Shared customer-preview chrome for product setup: create wizard handoff
 * (course page) and the digital-product edit page both render this so the
 * lifecycle reads as one product, not two preview systems.
 */
export function ProductFormCustomerPreview({
  title,
  emptyTitle,
  price,
  productType,
  coverUrl,
  description,
  descriptionLength,
  fileCount,
  imageFallback,
}: ProductFormCustomerPreviewProps) {
  const {trans} = useTrans();
  const trimmedTitle = title.trim();
  const descriptionText = description?.replace(/<[^>]*>/g, '').trim() ?? '';
  const showFileMeta = fileCount !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          <Trans message="Customer preview" />
        </p>
      </div>
      <ProductCard
        images={coverUrl ? [coverUrl] : []}
        title={trimmedTitle || trans({message: emptyTitle})}
        tags={[trans({message: PRODUCT_TYPE_LABELS[productType]})]}
        price={price}
        description={descriptionText || undefined}
        meta={
          showFileMeta ? (
            <>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileIcon className="size-4" aria-hidden="true" />
                <Trans
                  message="[one :count download file|other :count download files]"
                  values={{count: fileCount}}
                />
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <TypeIcon className="size-4" aria-hidden="true" />
                <Trans
                  message=":count characters in description"
                  values={{
                    count: trimmedTitle.length + (descriptionLength ?? 0),
                  }}
                />
              </span>
            </>
          ) : undefined
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
          imageFallback ?? (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <PackageOpenIcon className="size-8" aria-hidden="true" />
              <span className="text-xs">
                <Trans message="Add a cover image" />
              </span>
            </div>
          )
        }
      />
    </div>
  );
}

export function ProductPreview({buyerOnly = false}: {buyerOnly?: boolean}) {
  const {
    state: {title, description, price, coverUrl, files, productType},
  } = useProductCreation();
  return (
    <ProductFormCustomerPreview
      title={title}
      emptyTitle="Your digital product"
      price={buyerOnly && Number(price) === 0
        ? <Trans message="Free" />
        : formatPreviewPrice(price)}
      productType={productType}
      coverUrl={coverUrl || undefined}
      description={buyerOnly ? description : undefined}
      descriptionLength={buyerOnly ? undefined : description?.length ?? 0}
      fileCount={buyerOnly ? undefined : files.length}
    />
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
      tone: 'text-warning bg-warning/10',
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
