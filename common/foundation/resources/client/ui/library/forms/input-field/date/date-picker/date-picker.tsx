import {parseAbsolute, ZonedDateTime} from '@internationalized/date';
import {mergeProps} from '@react-aria/utils';
import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {useCurrentDateTime} from '@ui/i18n/use-current-date-time';
import {useDateFormatter} from '@ui/i18n/use-date-formatter';
import {useTrans} from '@ui/i18n/use-trans';
import {useUserTimezone} from '@ui/i18n/use-user-timezone';
import {CalendarIcon} from 'lucide-react';
import {Fragment, useRef} from 'react';
import {useController} from 'react-hook-form';
import {Calendar} from '../calendar/calendar';
import {
  DatePickerField,
  DatePickerFieldProps,
} from '../date-range-picker/date-picker-field';
import {DateSegmentList} from '../segments/date-segment-list';
import {
  DatePickerValueProps,
  useDatePickerState,
} from './use-date-picker-state';

export interface DatePickerProps
  extends
    Omit<DatePickerFieldProps, 'children'>,
    DatePickerValueProps<ZonedDateTime> {}

export function DatePicker({showCalendarFooter, ...props}: DatePickerProps) {
  const state = useDatePickerState(props);
  const inputRef = useRef<HTMLDivElement>(null);
  const now = useCurrentDateTime();

  const footer = (
    <div className="flex items-center justify-between gap-2.5">
      <Button
        disabled={state.isPlaceholder}
        variant="ghost"
        onClick={() => {
          state.clear();
        }}
      >
        <Trans message="Clear" />
      </Button>
      <Button
        variant="ghost"
        color="primary"
        onClick={() => {
          state.setSelectedValue(now);
          state.setCalendarIsOpen(false);
        }}
      >
        <Trans message="Today" />
      </Button>
    </div>
  );

  const popover = (
    <Popover.Root
      open={state.calendarIsOpen}
      onOpenChange={state.setCalendarIsOpen}
    >
      <Popover.Trigger
        render={
          <Button variant="ghost" size="icon-sm" disabled={props.disabled} />
        }
      >
        <CalendarIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-max max-w-[calc(100vw-24px)]"
          side="bottom"
          align="center"
          sideOffset={8}
          initialFocus={false}
          finalFocus={false}
        >
          <Calendar state={state} visibleMonths={1} />
          {showCalendarFooter && footer}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );

  return (
    <Fragment>
      <DatePickerField ref={inputRef} endAdornment={popover} {...props}>
        <DateSegmentList
          state={state}
          value={state.selectedValue}
          onChange={state.setSelectedValue}
          isPlaceholder={state.isPlaceholder}
        />
      </DatePickerField>
    </Fragment>
  );
}

interface FormDatePickerProps extends DatePickerProps {
  name: string;
}
export function FormDatePicker(props: FormDatePickerProps) {
  const {min, max} = props;
  const userTimezone = useUserTimezone();
  const timezone = props.timezone || userTimezone;
  const {trans} = useTrans();
  const {format} = useDateFormatter({timeZone: timezone});
  const {
    field: {onChange, onBlur, value = null, ref},
    fieldState: {invalid, error},
  } = useController({
    name: props.name,
    rules: {
      validate: v => {
        if (!v) return;
        const date = parseAbsolute(v, timezone);
        if (min && date.compare(min) < 0) {
          return trans({
            message: 'Enter a date after :date',
            values: {date: format(min.toDate(timezone))},
          });
        }
        if (max && date.compare(max) > 0) {
          return trans({
            message: 'Enter a date before :date',
            values: {date: format(max.toDate(timezone))},
          });
        }
      },
    },
  });

  const parsedValue: null | ZonedDateTime = value
    ? parseAbsolute(value, timezone)
    : null;

  const formProps: Partial<DatePickerProps> = {
    onChange: e => {
      onChange(e ? e.toAbsoluteString() : e);
    },
    onBlur,
    value: parsedValue,
    invalid,
    errorMessage: error?.message,
    inputRef: ref,
  };

  return <DatePicker {...mergeProps(formProps, props)} />;
}
