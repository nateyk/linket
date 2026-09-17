import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {
  BookIcon,
  DownloadIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  type LucideIcon,
} from 'lucide-react';
import {OptionRowContent} from './option-row';

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
    description: 'Offer a book or comic in PDF and EPUB formats.',
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
  return (
    <Toggle
      value={option.id}
      aria-label={option.title}
      className="group/type h-auto min-h-[76px] w-full shrink-0 justify-start gap-3 border-border bg-card px-3.5 py-3 text-start whitespace-normal shadow-xs ring-1 ring-transparent hover:border-foreground/15 hover:bg-muted/30 data-pressed:border-primary/60 data-pressed:bg-primary/5 data-pressed:ring-primary/15"
    >
      <OptionRowContent
        icon={option.icon}
        title={option.title}
        description={option.description}
      />
    </Toggle>
  );
}
