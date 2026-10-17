import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {cn} from '@ui/utils/cn';
import {
  BookIcon,
  DownloadIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  type LucideIcon,
} from 'lucide-react';
import type {ReactNode} from 'react';
import {OptionRowContent} from './option-row';

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
      className="flex w-full min-w-0 flex-col gap-2"
    >
      {PRODUCT_TYPES.map(option => (
        <label
          key={option.id}
          className={cn(
            'flex w-full shrink-0 cursor-pointer items-center justify-start gap-3 rounded-card-sm border border-border bg-card px-3 py-2.5 text-start whitespace-normal ring-1 ring-transparent outline-none hover:border-foreground/15 hover:bg-muted/30 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground',
            value === option.id &&
              'border-primary/60 bg-primary/5 ring-primary/15',
          )}
        >
          <OptionRowContent
            icon={option.icon}
            title={option.title}
            description={option.description}
            checked={value === option.id}
            hint={
              // Course has no single file capability; e-book's formats are
              // already stated in its description, so a hint would repeat it.
              option.id === 'course' || option.id === 'ebook'
                ? undefined
                : formats?.[option.id]?.hint
            }
          />
          {/* The real radio is the row's single visible indicator (no drawn
              twin). Its own focus ring is suppressed — the card outline is
              the one focus treatment (T1). */}
          <RadioGroupItem
            value={option.id}
            className="focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </label>
      ))}
    </RadioGroup>
  );
}
