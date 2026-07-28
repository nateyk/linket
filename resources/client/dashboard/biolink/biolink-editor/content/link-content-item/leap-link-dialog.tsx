import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {updateBiolinkLinkOptions} from '@app/dashboard/biolink/biolinks-queries';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {CrupdateBiolinkLinkBody} from '@app/gen/schemas/crupdate-biolink-link-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {FormDatePicker} from '@ui/forms/input-field/date/date-picker/date-picker';
import {Trans} from '@ui/i18n/trans';
import {useCurrentDateTime} from '@ui/i18n/use-current-date-time';
import {ReactNode} from 'react';
import {useForm} from 'react-hook-form';

interface LeapLinkDialogProps {
  link: BiolinkLink;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function LeapLinkDialog({
  link,
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: LeapLinkDialogProps) {
  const [open, setOpen] = useControlledState(openProp, false, onOpenChangeProp);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent link={link} onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  link,
  onClose,
}: {
  link: BiolinkLink;
  onClose: () => void;
}) {
  const now = useCurrentDateTime();
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);
  const form = useForm<CrupdateBiolinkLinkBody>({
    defaultValues: {
      leap_until: link.leap_until,
    },
  });
  const isDirty = form.formState.isDirty;
  const updateLink = useMutation(
    updateBiolinkLinkOptions(Number(biolinkId), link.id),
  );

  const handleSubmit = (values: CrupdateBiolinkLinkBody) => {
    updateLink.mutate(values, {
      onSuccess: response => {
        overrideContent(response.data.content);
        toast.success(<Trans message="Redirect link updated" />);
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Redirect link" />
          </Dialog.Title>
          <Dialog.Description>
            <Trans message="Send all visitors straight to this link, instead of showing link in bio, until the specified date. After that date, link in bio will resume to showing normally." />
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <FormDatePicker
            required
            size="sm"
            name="leap_until"
            min={now}
            label={<Trans message="Redirect until" />}
            showCalendarFooter
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={!isDirty || updateLink.isPending}>
            <Trans message="Save" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
