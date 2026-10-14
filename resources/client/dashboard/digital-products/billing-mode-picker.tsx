import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {GiftIcon, CreditCardIcon, type LucideIcon} from 'lucide-react';
import type {BillingMode} from './product-create-flow';
import {OptionRowContent} from './option-row';

type BillingModeOption = {
  id: BillingMode;
  icon: LucideIcon;
  title: string;
  description: string;
};

interface BillingModePickerProps {
  value: BillingMode | null;
  onValueChange: (value: BillingMode | null) => void;
}

export function BillingModePicker({
  value,
  onValueChange,
}: BillingModePickerProps) {
  const {trans} = useTrans();

  const BILLING_MODES: BillingModeOption[] = [
    {
      id: 'free',
      icon: GiftIcon,
      title: trans({message: 'Free'}),
      description: trans({message: 'Anyone can access it for free.'}),
    },
    {
      id: 'paid',
      icon: CreditCardIcon,
      title: trans({message: 'Paid'}),
      description: trans({message: 'Charge a one-time price in ETB.'}),
    },
  ];

  return (
    <RadioGroup
      orientation="vertical"
      value={value ?? ''}
      onValueChange={next => onValueChange(next as BillingMode)}
      aria-label={trans({message: 'Billing mode'})}
      className="flex w-full min-w-0 flex-col gap-2"
    >
      {BILLING_MODES.map(option => (
        <label
          key={option.id}
          className={cn(
            'flex w-full shrink-0 cursor-pointer items-center justify-start gap-3 rounded-card-sm border border-border bg-card px-3 py-2.5 text-start whitespace-normal shadow-xs ring-1 ring-transparent outline-none hover:border-foreground/15 hover:bg-muted/30 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground',
            value === option.id &&
              'border-primary/60 bg-primary/5 ring-primary/15',
          )}
        >
          <RadioGroupItem value={option.id} className="sr-only" />
          <OptionRowContent
            icon={option.icon}
            title={option.title}
            description={option.description}
            checked={value === option.id}
          />
        </label>
      ))}
    </RadioGroup>
  );
}
