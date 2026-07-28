import {Popover} from '@shadcn/popover/popover';
import {ColorPickerPopover} from '@ui/color-picker/color-picker-popover';
import {cn} from '@ui/utils/cn';
import {ReactNode, useId, useState} from 'react';
import {HexColorInput} from 'react-colorful';

interface ColorInputProps {
  value: string;
  onChange: (newValue: string) => void;
  label: ReactNode;
  className?: string;
  inputClassName?: string;
  hidePopoverFooter?: boolean;
}
export function ColorField({
  value,
  onChange,
  label,
  className,
  inputClassName,
  hidePopoverFooter,
}: ColorInputProps) {
  const id = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className={cn(className, 'min-w-0 flex-1')}>
      {label ? (
        <label className="mb-2 block text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="flex items-center">
        <ColorPickerPopover
          value={value}
          onChange={onChange}
          hideFooter={hidePopoverFooter}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
        >
          <Popover.Trigger
            render={
              <button
                type="button"
                className="size-9 shrink-0 rounded-s-input border border-e-0 bg-black"
                style={{backgroundColor: value}}
              />
            }
          />
        </ColorPickerPopover>

        <HexColorInput
          id={id}
          autoComplete="off"
          role="textbox"
          autoCorrect="off"
          spellCheck="false"
          required
          prefixed
          color={value || '#fff'}
          onChange={onChange}
          className={cn(
            'h-9 min-w-0 flex-1 rounded-e-input border border-border p-2',
            inputClassName,
          )}
          onClick={() => setPickerOpen(true)}
        />
      </div>
    </div>
  );
}
