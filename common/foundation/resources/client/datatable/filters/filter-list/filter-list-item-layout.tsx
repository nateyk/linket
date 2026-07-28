import {Popover} from '@shadcn/popover/popover';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {CloseIcon} from '@ui/icons/material/Close';
import {KeyboardArrowDownIcon} from '@ui/icons/material/KeyboardArrowDown';
import {ReactNode} from 'react';

type Props = {
  valueLabel: ReactNode;
  label: ReactNode;
  popoverContent: ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onRemove: () => void;
  isInactive: boolean;
};

export function FilterListItemLayout({
  isOpen,
  setIsOpen,
  label,
  valueLabel,
  popoverContent,
  onRemove,
  isInactive,
}: Props) {
  return (
    <div className="flex h-8 items-center overflow-hidden rounded-button border border-border text-sm font-medium [&_svg]:size-4">
      {!isInactive && (
        <Tooltip.Root>
          <Tooltip.Trigger
            className="flex aspect-square h-full shrink-0 items-center justify-center border-r transition-colors hover:bg-accent"
            onClick={() => onRemove()}
          >
            <CloseIcon />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Trans message="Remove filter" />
          </Tooltip.Content>
        </Tooltip.Root>
      )}
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger className="flex h-full items-center pr-2 pl-3 transition-colors hover:bg-accent">
          {label}
          <span className="mx-2 h-[calc(100%-0.8rem)] w-px bg-border" />
          <span className="mr-1">{valueLabel}</span>
          <KeyboardArrowDownIcon />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="w-74 p-1.5">
            {popoverContent}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
