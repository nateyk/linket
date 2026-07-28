import {
  CalendarDate,
  endOfMonth,
  getWeeksInMonth,
  startOfMonth,
  startOfWeek,
} from '@internationalized/date';
import {Button} from '@shadcn/button/button';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {useDateFormatter} from '@ui/i18n/use-date-formatter';
import {cn} from '@ui/utils/cn';
import {m} from 'framer-motion';
import {ChevronLeftIcon, ChevronRightIcon} from 'lucide-react';
import {DatePickerState} from '../date-picker/use-date-picker-state';
import {DateRangePickerState} from '../date-range-picker/use-date-range-picker-state';
import {dateIsInvalid} from '../utils';
import {CalendarCell} from './calendar-cell';

export interface CalendarMonthProps {
  state: DatePickerState | DateRangePickerState;
  startDate: CalendarDate;
  isFirst: boolean;
  isLast: boolean;
}
export function CalendarMonth({
  startDate,
  state,
  isFirst,
  isLast,
}: CalendarMonthProps) {
  const {localeCode} = useSelectedLocale();
  const weeksInMonth = getWeeksInMonth(startDate, localeCode);
  const monthStart = startOfWeek(startDate, localeCode);

  return (
    <div className="w-70 shrink-0">
      <CalendarMonthHeader
        isFirst={isFirst}
        isLast={isLast}
        state={state}
        currentMonth={startDate}
      />
      <div className="block" role="grid">
        <WeekdayHeader state={state} startDate={startDate} />
        {[...new Array(weeksInMonth).keys()].map(weekIndex => (
          <m.div className="mb-1.5 flex" key={weekIndex}>
            {[...new Array(7).keys()].map(dayIndex => (
              <CalendarCell
                key={dayIndex}
                date={monthStart.add({weeks: weekIndex, days: dayIndex})}
                currentMonth={startDate}
                state={state}
              />
            ))}
          </m.div>
        ))}
      </div>
    </div>
  );
}

interface CalendarMonthHeaderProps {
  state: DatePickerState | DateRangePickerState;
  currentMonth: CalendarDate;
  isFirst: boolean;
  isLast: boolean;
}
function CalendarMonthHeader({
  currentMonth,
  isFirst,
  isLast,
  state: {calendarDates, setCalendarDates, timezone, min, max},
}: CalendarMonthHeaderProps) {
  const shiftCalendars = (direction: 'forward' | 'backward') => {
    let newDates: CalendarDate[];
    if (direction === 'forward') {
      newDates = calendarDates.map(date => endOfMonth(date.add({months: 1})));
    } else {
      newDates = calendarDates.map(date =>
        endOfMonth(date.subtract({months: 1})),
      );
    }
    setCalendarDates(newDates);
  };

  const monthFormatter = useDateFormatter({
    month: 'long',
    year: 'numeric',
    era: currentMonth.calendar.identifier !== 'gregory' ? 'long' : undefined,
    calendar: currentMonth.calendar.identifier,
  });

  const isBackwardDisabled = dateIsInvalid(
    currentMonth.subtract({days: 1}),
    min,
    max,
  );
  const isForwardDisabled = dateIsInvalid(
    startOfMonth(currentMonth.add({months: 1})),
    min,
    max,
  );

  return (
    <div className="flex items-center justify-between gap-2.5">
      <Button
        variant="ghost"
        size="icon"
        className={cn(!isFirst && 'invisible')}
        disabled={!isFirst || isBackwardDisabled}
        aria-hidden={!isFirst}
        onClick={() => {
          shiftCalendars('backward');
        }}
      >
        <ChevronLeftIcon />
      </Button>
      <div className="text-sm font-medium select-none">
        {monthFormatter.format(currentMonth.toDate(timezone))}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn(!isLast && 'invisible')}
        disabled={!isLast || isForwardDisabled}
        aria-hidden={!isLast}
        onClick={() => {
          shiftCalendars('forward');
        }}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

interface WeekdayHeaderProps {
  state: DatePickerState | DateRangePickerState;
  startDate: CalendarDate;
}
function WeekdayHeader({state: {timezone}, startDate}: WeekdayHeaderProps) {
  const {localeCode} = useSelectedLocale();
  const dayFormatter = useDateFormatter({weekday: 'short'});

  const monthStart = startOfWeek(startDate, localeCode);

  return (
    <div className="flex">
      {[...new Array(7).keys()].map(index => {
        const date = monthStart.add({days: index});
        const dateDay = date.toDate(timezone);
        const weekday = dayFormatter.format(dateDay);
        return (
          <div
            className="relative flex size-10 shrink-0 items-center justify-center text-xs font-medium text-muted-foreground select-none"
            key={index}
          >
            {weekday}
          </div>
        );
      })}
    </div>
  );
}
