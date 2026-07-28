import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {updateBiolinkOptions} from '@app/dashboard/biolink/biolinks-queries';
import {LinkFormActionButtons} from '@app/dashboard/links/forms/link-form-action-buttons';
import {ShortUrlField} from '@app/dashboard/links/forms/short-url-field';
import {useLinkeableDefaultFormValues} from '@app/dashboard/links/utils/use-linkeable-default-form-values';
import {CrupdateBiolinkBody} from '@app/gen/schemas/crupdate-biolink-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {CornerDownLeftIcon, SettingsIcon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

type Props = {
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function BiolinkSettingsDialog({
  children,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
}: Props) {
  const [open, setOpen] = useControlledState(
    propsOpen,
    false,
    propsOnOpenChange,
  );
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Content onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Content({onClose}: {onClose: () => void}) {
  const biolink = useBiolinkEditorStore(s => s.biolink);

  const form = useForm<CrupdateBiolinkBody>({
    defaultValues: useLinkeableDefaultFormValues(biolink),
  });

  const updateBiolink = useMutation(updateBiolinkOptions(biolink.id));

  const handleSubmit = (values: CrupdateBiolinkBody) => {
    updateBiolink.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Link in bio updated" />);
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-3xl">
        <Dialog.Header>
          <Dialog.Title>
            <SettingsIcon />
            <Trans message="Link in bio settings" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="name">
              <Field.Label>
                <Trans message="Name" />
              </Field.Label>
              <Input autoFocus required minLength={3} maxLength={100} />
              <Field.Error />
            </HookForm.Field>

            <ShortUrlField
              domainLabel={<Trans message="Domain" />}
              domainName="domain_id"
              backHalfName="back_half"
            />
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer variant="muted" className="py-4 sm:justify-between">
          <LinkFormActionButtons form={form} />
          <Button
            size="sm"
            variant="default"
            color="primary"
            type="submit"
            disabled={updateBiolink.isPending}
          >
            <Trans message="Update" />
            <CornerDownLeftIcon data-icon="inline-end" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
