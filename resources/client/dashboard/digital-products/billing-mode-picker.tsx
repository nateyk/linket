import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {GiftIcon, TagIcon, type LucideIcon} from 'lucide-react';
import type {BillingMode} from './product-create-flow';
import {OptionRowContent} from './option-row';

type BillingModeOption = {
  id: BillingMode;
  icon: LucideIcon;
  title: string;
  description: string;
};

const BILLING_MODES: BillingModeOption[] = [
  {
    id: 'free',
    icon: GiftIcon,
    title: 'Free',
    description: 'Anyone can access it for free.',
  },
  {
    id: 'paid',
    icon: TagIcon,
    title: 'Paid',
    description: 'Charge a one-time price in ETB.',
  },
];

interface BillingModePickerProps {
  value: BillingMode | null;
  onValueChange: (value: BillingMode | null) => void;
}

export function BillingModePicker({
  value,
  onValueChange,
}: BillingModePickerProps) {
  return (
    <ToggleGroup
      orientation="vertical"
      variant="default"
      buttonVariant="outline"
      value={value ? [value] : []}
      onValueChange={values =>
        onValueChange((values[0] as BillingMode | undefined) ?? null)
      }
      aria-label="Billing mode"
      className="flex w-full min-w-0 flex-col gap-2 [&>[data-slot]]:rounded-card-sm! [&>[data-slot]~[data-slot]]:rounded-t-card-sm! [&>[data-slot]~[data-slot]]:border-t!"
    >
      {BILLING_MODES.map(option => (
        <Toggle
          key={option.id}
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
      ))}
    </ToggleGroup>
  );
}
