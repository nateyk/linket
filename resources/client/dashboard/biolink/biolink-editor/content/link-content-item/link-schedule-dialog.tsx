import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {updateBiolinkLinkOptions} from '@app/dashboard/biolink/biolinks-queries';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {CrupdateBiolinkLinkBody} from '@app/gen/schemas/crupdate-biolink-link-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {parseAbsolute} from '@internationalized/date';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {FormDatePicker} from '@ui/forms/input-field/date/date-picker/date-picker';
import {Trans} from '@ui/i18n/trans';
import {useCurrentDateTime} from '@ui/i18n/use-current-date-time';
import {useUserTimezone} from '@ui/i18n/use-user-timezone';
import {ReactNode, useMemo} from 'react';
import {useForm, useWatch} from 'react-hook-form';

interface LinkScheduleDialogProps {
  link: BiolinkLink;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function LinkScheduleDialog({
  link,
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: LinkScheduleDialogProps) {
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
  const timezone = useUserTimezone();
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);

  const form = useForm<CrupdateBiolinkLinkBody>({
    defaultValues: {
      activates_at: link.activates_at,
      expires_at: link.expires_at,
    },
  });
  const isDirty = form.formState.isDirty;
  const activationDate = useWatch({
    name: 'activates_at',
    control: form.control,
  });

  const updateLink = useMutation(
    updateBiolinkLinkOptions(Number(biolinkId), link.id),
  );

  const expirationMinDate = useMemo(() => {
    if (activationDate) {
      return parseAbsolute(activationDate, timezone);
    }
    return now;
  }, [activationDate, now, timezone]);

  const handleSubmit = (values: CrupdateBiolinkLinkBody) => {
    updateLink.mutate(values, {
      onSuccess: response => {
        overrideContent(response.data.content);
        toast.success(<Trans message="Schedule updated" />);
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
            <Trans message="Link schedule" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <FormDatePicker
              name="activates_at"
              min={now}
              size="sm"
              label={<Trans message="Start date" />}
              description={
                <Trans message="Leave start date blank to display this link immediately." />
              }
              showCalendarFooter
            />
            <FormDatePicker
              name="expires_at"
              min={expirationMinDate}
              size="sm"
              label={<Trans message="End date" />}
              description={
                <Trans message="Leave end date blank to display this link forever." />
              }
              showCalendarFooter
            />
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={updateLink.isPending || !isDirty}>
            <Trans message="Save" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
