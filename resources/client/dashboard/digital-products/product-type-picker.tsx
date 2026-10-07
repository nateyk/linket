import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {useTrans} from '@ui/i18n/use-trans';
import {Trans} from '@ui/i18n/trans';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {cn} from '@ui/utils/cn';
import {useUsage} from '@app/dashboard/use-usage';
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

interface ProductTypePickerProps {
  value: ProductType | null;
  onValueChange: (value: ProductType | null) => void;
}

export function ProductTypePicker({
  value,
  onValueChange,
}: ProductTypePickerProps) {
  const {trans} = useTrans();
  const {data: usageData} = useUsage();
  const storage = usageData?.data?.storage;
  const formats = getBootstrapData()?.product_file_formats;

  const PRODUCT_TYPES: ProductTypeOption[] = [
    {
      id: 'digital',
      icon: DownloadIcon,
      title: trans({message: 'Digital product'}),
      description: trans({
        message: 'Any set of files to download or stream.',
      }),
    },
    {
      id: 'ebook',
      icon: BookIcon,
      title: trans({message: 'E-book'}),
      description: trans({
        message: 'Offer a book or comic in PDF and EPUB formats.',
      }),
    },
    {
      id: 'audio',
      icon: HeadphonesIcon,
      title: trans({message: 'Audio'}),
      description: trans({
        message: 'Sell music, podcasts, or any audio content.',
      }),
    },
    {
      id: 'course',
      icon: GraduationCapIcon,
      title: trans({message: 'Course'}),
      description: trans({
        message:
          'Sell a structured curriculum with chapters, lessons, video and resources.',
      }),
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
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
              'flex h-auto min-h-[76px] w-full shrink-0 cursor-pointer items-center justify-start gap-3 rounded-card-sm border border-border bg-card px-3.5 py-3 text-start whitespace-normal shadow-xs ring-1 ring-transparent outline-none hover:border-foreground/15 hover:bg-muted/30 focus-within:ring-2 focus-within:ring-ring/30',
              value === option.id &&
                'border-primary/60 bg-primary/5 ring-primary/15',
            )}
          >
            <RadioGroupItem value={option.id} className="sr-only" />
            <OptionRowContent
              icon={option.icon}
              title={option.title}
              description={option.description}
              hint={
                option.id === 'course'
                  ? undefined
                  : formats?.[option.id]?.hint
              }
            />
          </label>
        ))}
      </RadioGroup>
      {storage && (
        <p className="text-xs text-muted-foreground">
          <Trans message="Storage" />
          {': '}
          {storage.total !== null ? (
            <Trans
              message=":used of :total"
              values={{
                used: prettyBytes(storage.used),
                total: prettyBytes(storage.total),
              }}
            />
          ) : (
            <Trans
              message=":used used · Unlimited"
              values={{used: prettyBytes(storage.used)}}
            />
          )}
        </p>
      )}
    </div>
  );
}
