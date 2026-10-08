import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {CalendarRangeIcon} from 'lucide-react';

interface PeriodPickerProps {
  from: string;
  to: string;
  onChange: (period: {from: string; to: string}) => void;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentMonthPeriod(): {from: string; to: string} {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(lastDay),
  };
}

export function PeriodPicker({from, to, onChange}: PeriodPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={from}
        bindToHookForm={false}
        aria-label="From"
        onChange={e => onChange({from: e.target.value, to})}
        className="w-auto"
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="date"
        value={to}
        bindToHookForm={false}
        aria-label="To"
        onChange={e => onChange({from, to: e.target.value})}
        className="w-auto"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(currentMonthPeriod())}
      >
        <CalendarRangeIcon className="size-4" />
        <Trans message="This month" />
      </Button>
    </div>
  );
}