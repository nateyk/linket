import {Button} from '@shadcn/button/button';
import {Form} from '@shadcn/forms/form/form';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {ChevronLeftIcon} from 'lucide-react';
import {ReactNode} from 'react';

type Props = {
  label: ReactNode;
  onDismiss?: () => void;
  onApply: () => void;
  children: ReactNode;
};

export function ApplyFilterPopoverContent({
  label,
  onDismiss,
  onApply,
  children,
}: Props) {
  return (
    <Form
      className="flex flex-col gap-4 p-2.5"
      onSubmit={e => {
        e.stopPropagation();
        e.preventDefault();
        onApply();
      }}
    >
      <Popover.Header>
        <Popover.Title className="flex items-center gap-3 text-sm">
          {onDismiss && (
            <Button variant="outline" size="icon-sm" onClick={onDismiss}>
              <ChevronLeftIcon />
            </Button>
          )}
          {label}
        </Popover.Title>
      </Popover.Header>
      {children}
      <Button
        type="submit"
        variant="default"
        color="primary"
        size="sm"
        className="w-full"
      >
        <Trans message="Apply" />
      </Button>
    </Form>
  );
}
