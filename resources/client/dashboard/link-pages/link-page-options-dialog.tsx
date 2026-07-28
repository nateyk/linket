import {useUsage} from '@app/dashboard/use-usage';
import {updateLinkPageOptions} from '@app/dashboard/link-pages/link-pages-queries';
import {CrupdateLinkPageBody} from '@app/gen/schemas/crupdate-link-page-body';
import {LinkPage} from '@app/gen/schemas/link-page';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Switch} from '@shadcn/forms/switch/switch';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Tooltip} from '@ui/tooltip/tooltip';
import {SettingsIcon} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';

export function LinkPageOptionsDialog({page}: {page: LinkPage}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Tooltip label={<Trans message="Page options" />}>
        <Dialog.Trigger
          render={<Button variant="ghost" color="default" size="icon-sm" />}
        >
          <SettingsIcon />
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <OptionsDialog page={page} onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface OptionsDialogProps {
  page: LinkPage;
  onClose: () => void;
}
function OptionsDialog({page, onClose: onSubmitSuccess}: OptionsDialogProps) {
  const {data} = useUsage();
  const canChangeOptions = data?.data.link_pages.options;
  const form = useForm<CrupdateLinkPageBody>({
    defaultValues: {
      hide_footer: page.hide_footer,
      hide_navbar: page.hide_navbar,
    },
  });
  const updateOptions = useMutation(updateLinkPageOptions(page.id));

  const handleSubmit = (values: CrupdateLinkPageBody) => {
    updateOptions.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Link page options updated" />);
        onSubmitSuccess();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={values => handleSubmit(values)}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Link page options" />
            {!canChangeOptions && (
              <NoFeaturePermissionPopover.Root
                message={
                  <Trans message="Your current plan does not include link page option editing." />
                }
              >
                <NoFeaturePermissionPopover.ButtonTrigger />
              </NoFeaturePermissionPopover.Root>
            )}
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="hide_navbar" disabled={!canChangeOptions}>
              <Field.Label>
                <Switch />
                <Trans message="Hide navbar" />
              </Field.Label>
              <Field.Description>
                <Trans message="Whether navbar should be hidden on this link page." />
              </Field.Description>
            </HookForm.Field>
            <HookForm.Field name="hide_footer" disabled={!canChangeOptions}>
              <Field.Label>
                <Switch />
                <Trans message="Hide footer" />
              </Field.Label>
              <Field.Description>
                <Trans message="Whether footer should be hidden on this link page." />
              </Field.Description>
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button
            type="submit"
            disabled={updateOptions.isPending || !canChangeOptions}
          >
            <Trans message="Save changes" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
