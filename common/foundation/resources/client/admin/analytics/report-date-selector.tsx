import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {Granularity} from '@ui/forms/input-field/date/date-picker/use-date-picker-state';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangeComparePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-compare-presets';
import {DateRangePopoverContent} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-popover-content';
import {useDateRangePickerState} from '@ui/forms/input-field/date/date-range-picker/use-date-range-picker-state';
import {DateFormatPresets} from '@ui/i18n/formatted-date';
import {FormattedDateTimeRange} from '@ui/i18n/formatted-date-time-range';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {CalendarIcon} from 'lucide-react';

const monthDayFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: '2-digit',
};

interface ReportDataSelectorProps {
  value: DateRangeValue;
  disabled?: boolean;
  onChange: (value: DateRangeValue) => void;
  compactOnMobile?: boolean;
  enableCompare?: boolean;
  granularity?: Granularity;
}
export function ReportDateSelector({
  value,
  onChange,
  disabled,
  compactOnMobile = true,
  enableCompare = false,
  granularity = 'minute',
}: ReportDataSelectorProps) {
  const isMobile = useIsMobileMediaQuery();
  const state = useDateRangePickerState({
    granularity,
    defaultValue: {
      start: value.start,
      end: value.end,
      preset: value.preset,
    },
    closeDialogOnSelection: false,
  });
  const compareHasInitialValue = !!value.compareStart && !!value.compareEnd;
  const compareState = useDateRangePickerState({
    granularity,
    defaultValue: compareHasInitialValue
      ? {
          start: value.compareStart,
          end: value.compareEnd,
          preset: value.comparePreset,
        }
      : DateRangeComparePresets[0]!.getRangeValue(state.selectedValue),
  });

  return (
    <Popover.Root
      open={state.calendarIsOpen}
      onOpenChange={state.setCalendarIsOpen}
    >
      <Popover.Trigger
        render={<Button variant="outline" disabled={disabled} />}
      >
        <FormattedDateTimeRange
          start={value.start}
          end={value.end}
          options={
            isMobile && compactOnMobile
              ? monthDayFormat
              : DateFormatPresets.short
          }
        />
        <CalendarIcon data-align="end" />
      </Popover.Trigger>
      <Popover.Portal>
        <DateRangePopoverContent
          state={state}
          compareState={enableCompare ? compareState : undefined}
          compareVisibleDefault={compareHasInitialValue}
          showInlineDatePickerField={!isMobile}
          onClose={value => {
            if (value) {
              onChange(value);
            }
            state.setCalendarIsOpen(false);
          }}
        />
      </Popover.Portal>
    </Popover.Root>
  );
}
