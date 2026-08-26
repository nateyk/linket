import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {Trans} from '@ui/i18n/trans';
import {
  BookIcon,
  CheckIcon,
  DownloadIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  type LucideIcon,
} from 'lucide-react';

export type ProductType = 'digital' | 'ebook' | 'audio' | 'course';

type ProductTypeOption = {
  id: ProductType;
  icon: LucideIcon;
  title: string;
  description: string;
};

const PRODUCT_TYPES: ProductTypeOption[] = [
  {
    id: 'digital',
    icon: DownloadIcon,
    title: 'Digital product',
    description: 'Any set of files to download or stream.',
  },
  {
    id: 'ebook',
    icon: BookIcon,
    title: 'E-book',
    description: 'Offer a book or comic in PDF, ePub, and Mobi formats.',
  },
  {
    id: 'audio',
    icon: HeadphonesIcon,
    title: 'Audio',
    description: 'Sell music, podcasts, or any audio content.',
  },
  {
    id: 'course',
    icon: GraduationCapIcon,
    title: 'Course',
    description: 'Sell a structured curriculum with chapters, lessons, video and resources.',
  },
];

interface ProductTypePickerProps {
  value: ProductType | null;
  onValueChange: (value: ProductType | null) => void;
}

export function ProductTypePicker({
  value,
  onValueChange,
}: ProductTypePickerProps) {
  return (
    <ToggleGroup
      orientation="vertical"
      variant="default"
      buttonVariant="outline"
      value={value ? [value] : []}
      onValueChange={values =>
        onValueChange((values[0] as ProductType | undefined) ?? null)
      }
      aria-label="Product type"
      className="flex w-full min-w-0 flex-col gap-2 [&>[data-slot]]:rounded-card-sm! [&>[data-slot]~[data-slot]]:rounded-t-card-sm! [&>[data-slot]~[data-slot]]:border-t!"
    >
      {PRODUCT_TYPES.map(option => (
        <ProductTypeOptionRow key={option.id} option={option} />
      ))}
    </ToggleGroup>
  );
}

function ProductTypeOptionRow({option}: {option: ProductTypeOption}) {
  const Icon = option.icon;

  return (
    <Toggle
      value={option.id}
      aria-label={option.title}
      className="group/type h-auto min-h-[76px] w-full shrink-0 justify-start gap-3 border-border bg-card px-3.5 py-3 text-start whitespace-normal shadow-xs ring-1 ring-transparent hover:border-foreground/15 hover:bg-muted/30 data-pressed:border-primary/60 data-pressed:bg-primary/5 data-pressed:ring-primary/15"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-muted text-muted-foreground ring-1 ring-foreground/5 group-data-pressed/type:bg-primary/10 group-data-pressed/type:text-primary group-data-pressed/type:ring-primary/15">
        <Icon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-foreground">
          <Trans message={option.title} />
        </span>
        <span className="text-xs leading-relaxed font-normal text-muted-foreground">
          <Trans message={option.description} />
        </span>
      </span>
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition-colors group-data-pressed/type:border-primary group-data-pressed/type:bg-primary group-data-pressed/type:text-primary-foreground">
        <CheckIcon className="size-3 opacity-0 transition-opacity group-data-pressed/type:opacity-100" />
      </span>
    </Toggle>
  );
}
