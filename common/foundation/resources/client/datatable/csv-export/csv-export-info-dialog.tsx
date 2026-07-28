import {useControlledState} from '@react-stately/utils';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function CsvExportInfoDialog({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  children,
}: Props) {
  const [open, onOpenChange] = useControlledState(
    openProp,
    false,
    onOpenChangeProp,
  );

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Csv export" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans
                message="Your request is being processed. We'll email you when the report is ready to download. In
            certain cases, it might take a little longer, depending on the number of items beings
            exported and the volume of activity."
              />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer className="group-data-[size=sm]/alert-dialog-content:block">
            <AlertDialog.Cancel variant="default" className="w-full">
              <Trans message="Got it" />
            </AlertDialog.Cancel>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
