import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Switch} from '@shadcn/forms/switch/switch';
import {Popover} from '@shadcn/popover/popover';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangeComparePresetList} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-compare-preset-list';
import {FormattedDateTimeRange} from '@ui/i18n/formatted-date-time-range';
import {Trans} from '@ui/i18n/trans';
import {useIsTabletMediaQuery} from '@ui/utils/hooks/is-tablet-media-query';
import {MoveRightIcon} from 'lucide-react';
import {ComponentProps, ReactNode, useRef, useState} from 'react';
import {Calendar} from '../../calendar/calendar';
import {DateSegmentList} from '../../segments/date-segment-list';
import {DatePickerField} from '../date-picker-field';
import {DateRangePickerState} from '../use-date-range-picker-state';
import {DatePresetList} from './date-range-preset-list';

type ContentProps = {
  state: DateRangePickerState;
  compareState?: DateRangePickerState;
  compareVisibleDefault?: boolean;
  showInlineDatePickerField?: boolean;
  onClose: (value?: DateRangeValue) => void;
} & ComponentProps<typeof Popover.Content>;

export function DateRangePopoverContent({
  state,
  compareState,
  compareVisibleDefault,
  showInlineDatePickerField,
  onClose,
  ...props
}: ContentProps) {
  const isTablet = useIsTabletMediaQuery();
  const initialStateRef = useRef<DateRangePickerState>(state);
  const hasPlaceholder = state.isPlaceholder.start || state.isPlaceholder.end;
  const [compareVisible, setCompareVisible] = useState(compareVisibleDefault);

  const footer = (
    <div className="flex items-center gap-2 border-t p-4">
      {!hasPlaceholder && !isTablet ? (
        <div className="text-xs">
          <FormattedDateTimeRange
            start={state.selectedValue.start.toDate()}
            end={state.selectedValue.end.toDate()}
            options={{dateStyle: 'medium'}}
          />
        </div>
      ) : undefined}
      <Button
        className="ml-auto"
        variant="ghost"
        size="sm"
        onClick={() => {
          state.setSelectedValue(initialStateRef.current.selectedValue);
          state.setIsPlaceholder(initialStateRef.current.isPlaceholder);
          onClose();
        }}
      >
        <Trans message="Cancel" />
      </Button>
      <Button
        variant="default"
        color="primary"
        size="sm"
        onClick={() => {
          const value = state.selectedValue;
          if (compareState && compareVisible) {
            value.compareStart = compareState.selectedValue.start;
            value.compareEnd = compareState.selectedValue.end;
          }
          onClose(value);
        }}
      >
        <Trans message="Select" />
      </Button>
    </div>
  );

  return (
    <Popover.Content
      className="w-max max-w-[calc(100vw-24px)] gap-0 p-0"
      {...props}
    >
      <div className="flex">
        {!isTablet && (
          <div className="min-w-48 p-2.5">
            <DatePresetList
              selectedValue={state.selectedValue}
              onPresetSelected={preset => {
                state.setSelectedValue(preset);
                if (state.closeDialogOnSelection) {
                  onClose(preset);
                }
              }}
            />
            {!!compareState && (
              <>
                <Field.Root orientation="horizontal" className="m-3">
                  <Switch
                    checked={compareVisible}
                    onCheckedChange={setCompareVisible}
                  >
                    <Trans message="Compare" />
                  </Switch>
                  <Field.Label>
                    <Trans message="Compare" />
                  </Field.Label>
                </Field.Root>
                {compareVisible && (
                  <DateRangeComparePresetList
                    originalRangeValue={state.selectedValue}
                    selectedValue={compareState?.selectedValue}
                    onPresetSelected={preset => {
                      compareState.setSelectedValue(preset);
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}
        <Calendars
          state={state}
          compareState={compareState}
          showInlineDatePickerField={showInlineDatePickerField}
          compareVisible={compareVisible}
        />
      </div>
      {!state.closeDialogOnSelection && footer}
    </Popover.Content>
  );
}

interface CustomRangePanelProps {
  state: DateRangePickerState;
  compareState?: DateRangePickerState;
  showInlineDatePickerField?: boolean;
  compareVisible?: boolean;
}
function Calendars({
  state,
  compareState,
  showInlineDatePickerField,
  compareVisible,
}: CustomRangePanelProps) {
  return (
    <div className="border-l px-5 pt-2.5 pb-5">
      {showInlineDatePickerField && (
        <div>
          <InlineDatePickerField state={state} />
          {!!compareState && compareVisible && (
            <InlineDatePickerField
              state={compareState}
              label={<Trans message="Compare" />}
            />
          )}
        </div>
      )}
      <div className="flex items-start gap-9">
        <Calendar state={state} visibleMonths={2} />
      </div>
    </div>
  );
}

interface InlineDatePickerFieldProps {
  state: DateRangePickerState;
  label?: ReactNode;
}
function InlineDatePickerField({state, label}: InlineDatePickerFieldProps) {
  const {selectedValue, setSelectedValue} = state;
  return (
    <DatePickerField size="sm" className="mt-2.5 mb-5" label={label}>
      <DateSegmentList
        state={state}
        value={selectedValue.start}
        onChange={newValue => {
          setSelectedValue({...selectedValue, start: newValue});
        }}
      />
      <MoveRightIcon className="block size-4 shrink-0 text-muted-foreground" />
      <DateSegmentList
        state={state}
        value={selectedValue.end}
        onChange={newValue => {
          setSelectedValue({...selectedValue, end: newValue});
        }}
      />
    </DatePickerField>
  );
}
