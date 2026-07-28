import {
  CalendarDate,
  DateValue,
  getDayOfWeek,
  isSameMonth,
  isToday,
} from '@internationalized/date';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import clsx from 'clsx';
import {DatePickerState} from '../date-picker/use-date-picker-state';
import {DateRangePickerState} from '../date-range-picker/use-date-range-picker-state';
import {dateIsInvalid} from '../utils';

interface CalendarCellProps {
  date: CalendarDate;
  currentMonth: DateValue;
  state: DatePickerState | DateRangePickerState;
}
export function CalendarCell({
  date,
  currentMonth,
  state: {
    dayIsActive,
    dayIsHighlighted,
    dayIsRangeStart,
    dayIsRangeEnd,
    getCellProps,
    timezone,
    min,
    max,
  },
}: CalendarCellProps) {
  const {localeCode} = useSelectedLocale();
  const dayOfWeek = getDayOfWeek(date, localeCode);
  const isActive = dayIsActive(date);
  const isHighlighted = dayIsHighlighted(date);
  const isRangeStart = dayIsRangeStart(date);
  const isRangeEnd = dayIsRangeEnd(date);
  const dayIsToday = isToday(date, timezone);
  const sameMonth = isSameMonth(date, currentMonth);
  const isDisabled = dateIsInvalid(date, min, max);

  return (
    <div
      role="button"
      aria-disabled={isDisabled}
      className={clsx(
        'relative isolate size-10 shrink-0 text-sm',
        isDisabled && 'pointer-events-none text-foreground/30',
        !sameMonth && 'pointer-events-none invisible',
      )}
      {...getCellProps(date, sameMonth)}
    >
      <span
        className={clsx(
          'absolute inset-0 z-10 flex h-full w-full cursor-pointer items-center justify-center rounded-full select-none',
          isHighlighted && !isActive && 'hover:bg-foreground/10',
          !isHighlighted && !isActive && 'hover:bg-accent',
          isActive && 'bg-primary font-semibold text-primary-foreground',
          dayIsToday && !isActive && 'bg-accent',
          dayIsToday && 'font-semibold',
        )}
      >
        {date.day}
      </span>
      {isHighlighted && sameMonth && (
        <span
          className={clsx(
            'absolute inset-0 h-full w-full bg-accent',
            (isRangeStart || dayOfWeek === 0 || date.day === 1) &&
              'rounded-l-full',
            (isRangeEnd ||
              dayOfWeek === 6 ||
              date.day ===
                currentMonth.calendar.getDaysInMonth(currentMonth)) &&
              'rounded-r-full',
          )}
        />
      )}
    </div>
  );
}
