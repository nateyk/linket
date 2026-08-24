import {createStoreOptions} from '@app/dashboard/stores/stores-queries';
import {useSelectedStoreId} from '@app/dashboard/stores/use-selected-store-id';
import {ShortUrlField} from '@app/dashboard/links/forms/short-url-field';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateBiolinkBody} from '@app/gen/schemas/crupdate-biolink-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {nanoid} from 'nanoid';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

type Props = {
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateBiolinkDialog({
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
        <DialogContent onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({onClose}: {onClose: () => void}) {
  const {custom_domains} = useSettings();
  const navigate = useNavigate();
  const {routeType} = useDatatableRouteType();
  const [, setSelectedBiolinkId] = useSelectedStoreId();
  const form = useForm<CrupdateBiolinkBody>({
    defaultValues: {
      name: '',
      back_half: nanoid(6),
      domain_id: custom_domains?.allow_all_option ? undefined : 0,
    },
  });
  const createBiolink = useMutation(createStoreOptions());

  const handleSubmit = (values: CrupdateBiolinkBody) => {
    createBiolink.mutate(values, {
      onSuccess: response => {
        toast.success(<Trans message="Link in bio created" />);
        if (routeType === 'dashboard') {
          setSelectedBiolinkId(response.data.id);
        }
        navigate(`/${routeType}/stores/${response.data.id}`);
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="md:max-w-xl">
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Create new link in bio" />
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

        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={createBiolink.isPending}>
            <Trans message="Create" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
