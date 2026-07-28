import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {CalendarIcon, MoveRightIcon} from 'lucide-react';
import {DatePickerValueProps} from '../date-picker/use-date-picker-state';
import {DateSegmentList} from '../segments/date-segment-list';
import {DatePickerField, DatePickerFieldProps} from './date-picker-field';
import {DateRangeValue} from './date-range-value';
import {DateRangePopoverContent} from './dialog/date-range-popover-content';
import {useDateRangePickerState} from './use-date-range-picker-state';

export interface DateRangePickerProps
  extends
    DatePickerValueProps<Partial<DateRangeValue>>,
    Omit<DatePickerFieldProps, 'children'> {}

export function DateRangePicker(props: DateRangePickerProps) {
  const {granularity, closeDialogOnSelection, ...fieldProps} = props;
  const state = useDateRangePickerState(props);

  const popover = (
    <Popover.Root
      open={state.calendarIsOpen}
      onOpenChange={state.setCalendarIsOpen}
    >
      <Popover.Trigger render={<Button variant="ghost" size="icon-sm" />}>
        <CalendarIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <DateRangePopoverContent
          align="center"
          side="bottom"
          sideOffset={8}
          initialFocus={false}
          finalFocus={false}
          state={state}
          onClose={next => {
            if (next) {
              onChange(next);
            }
            state.setCalendarIsOpen(false);
          }}
        />
      </Popover.Portal>
    </Popover.Root>
  );

  const value = state.selectedValue;
  const onChange = state.setSelectedValue;

  return (
    <DatePickerField endAdornment={popover} {...fieldProps}>
      <DateSegmentList
        isPlaceholder={state.isPlaceholder?.start}
        state={state}
        value={value.start}
        onChange={newValue => {
          onChange({start: newValue, end: value.end});
        }}
      />
      <MoveRightIcon className="pointer-events-none block size-4 shrink-0 text-muted-foreground" />

      <DateSegmentList
        isPlaceholder={state.isPlaceholder?.end}
        state={state}
        value={value.end}
        onChange={newValue => {
          onChange({start: value.start, end: newValue});
        }}
      />
    </DatePickerField>
  );
}
