import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  BookIcon,
  DownloadIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  type LucideIcon,
} from 'lucide-react';
import type {ReactNode} from 'react';

export type ProductType = 'digital' | 'ebook' | 'audio' | 'course';

type ProductTypeOption = {
  id: ProductType;
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
};

interface ProductTypePickerProps {
  value: ProductType | null;
  onValueChange: (value: ProductType | null) => void;
}

export function ProductTypePicker({
  value,
  onValueChange,
}: ProductTypePickerProps) {
  const {trans} = useTrans();
  const formats = getBootstrapData()?.product_file_formats;

  const PRODUCT_TYPES: ProductTypeOption[] = [
    {
      id: 'digital',
      icon: DownloadIcon,
      title: <Trans message="Digital product" />,
      description: <Trans message="Files to download or stream." />,
    },
    {
      id: 'ebook',
      icon: BookIcon,
      title: <Trans message="E-book" />,
      description: <Trans message="A book or comic in PDF and EPUB." />,
    },
    {
      id: 'audio',
      icon: HeadphonesIcon,
      title: <Trans message="Audio" />,
      description: <Trans message="Music, podcasts, or other audio." />,
    },
    {
      id: 'course',
      icon: GraduationCapIcon,
      title: <Trans message="Course" />,
      description: (
        <Trans message="A curriculum with chapters, lessons, and video." />
      ),
    },
  ];

  return (
    <RadioGroup
      orientation="vertical"
      value={value ?? ''}
      onValueChange={next => onValueChange(next as ProductType)}
      aria-label={trans({message: 'Product type'})}
      className="grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
    >
      {PRODUCT_TYPES.map(option => {
        const selected = value === option.id;
        const Icon = option.icon;
        const hint =
          option.id === 'course' || option.id === 'ebook'
            ? undefined
            : formats?.[option.id]?.hint;

        return (
          <label
            key={option.id}
            className={cn(
              'group flex min-w-0 cursor-pointer flex-col items-start gap-3 rounded-card-sm border p-3.5 text-start whitespace-normal outline-none transition-[border-color,background-color] has-[:focus-visible]:border-transparent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-ring',
              selected
                ? 'border-primary/60 bg-primary/5'
                : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/30',
            )}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <span
                aria-hidden="true"
                data-slot="product-type-icon"
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-card-sm transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground group-hover:bg-accent',
                )}
              >
                <Icon className="size-4" />
              </span>
              {/* The real radio remains the only selection indicator. It is
                  visible and keyboard focus draws an outline around the card. */}
              <RadioGroupItem
                value={option.id}
                className="focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <span className="flex w-full min-w-0 flex-col gap-0.5">
              <span className="text-sm leading-tight font-semibold text-foreground">
                {option.title}
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </span>
              {hint && (
                <span className="mt-1 text-[11px] leading-tight font-medium text-muted-foreground">
                  {hint}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
