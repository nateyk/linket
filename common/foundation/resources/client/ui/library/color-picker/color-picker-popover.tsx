import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement, useRef} from 'react';
import {ColorPicker} from './color-picker';

interface Props {
  hideFooter?: boolean;
  showInput?: boolean;
  value: string;
  onChange?: (value: string) => void;
  onApply?: (value: string) => void;
  children?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: ComponentProps<typeof Popover.Content>['side'];
}
export function ColorPickerPopover({
  hideFooter = false,
  showInput = true,
  value,
  onChange,
  onApply,
  children,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  side = 'bottom',
}: Props) {
  const [open, setOpen] = useControlledState(
    propsOpen,
    false,
    propsOnOpenChange,
  );
  const initialValue = useRef(value);
  const internalValue = useRef(value);

  return (
    <Popover.Root
      open={open}
      onOpenChange={isOpen => {
        if (isOpen) {
          internalValue.current = value;
          initialValue.current = value;
        } else {
          onChange?.(initialValue.current);
        }
        setOpen(isOpen);
      }}
    >
      {children}
      <Popover.Portal>
        <PopoverContent
          side={side}
          showInput={showInput}
          hideFooter={hideFooter}
          value={value}
          onChange={newValue => {
            internalValue.current = newValue;
            onChange?.(newValue);
          }}
          onApply={() => {
            onChange?.(internalValue.current);
            setOpen(false);
            onApply?.(internalValue.current);
          }}
        />
      </Popover.Portal>
    </Popover.Root>
  );
}

type PopoverContentProps = {
  side: ComponentProps<typeof Popover.Content>['side'];
  hideFooter: boolean;
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  showInput: boolean;
};

function PopoverContent({
  side,
  hideFooter,
  value,
  onChange,
  onApply,
  showInput,
}: PopoverContentProps) {
  return (
    <Popover.Content className="gap-0 p-3" initialFocus={false} side={side}>
      <ColorPicker showInput={showInput} value={value} onChange={onChange} />
      {!hideFooter && (
        <div className="flex justify-end gap-2 border-t pt-3">
          <Popover.CloseButton render={<Button variant="ghost" size="sm" />}>
            <Trans message="Cancel" />
          </Popover.CloseButton>
          <Button
            variant="default"
            color="primary"
            size="sm"
            onClick={() => onApply()}
          >
            <Trans message="Apply" />
          </Button>
        </div>
      )}
    </Popover.Content>
  );
}
