import {useCrupdateBiolinkWidget} from '@app/dashboard/stores/store-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {TypeIcon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

export interface TextWidget extends BiolinkWidget {
  type: 'text';
  config: {
    title: string;
    description?: string;
  };
}

type Props = {
  widget?: TextWidget;
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function TextWidgetDialog({
  children,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  widget,
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
        <TextWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TextWidgetDialogContent({
  widget,
  onClose,
}: {
  widget?: TextWidget;
  onClose: () => void;
}) {
  const {storeId} = useRequiredParams(['storeId']);
  const form = useForm<TextWidget['config']>({
    defaultValues: {
      title: widget?.config?.title ?? '',
      description: widget?.config?.description ?? '',
    },
  });

  const crupdateWidget = useCrupdateBiolinkWidget(storeId, form, widget?.id);
  const handleSubmit = (values: TextWidget['config']) => {
    crupdateWidget.mutate(
      {
        config: values,
        type: 'text',
      },
      {
        onSuccess: () => onClose(),
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <TypeIcon />
            <Trans message="Text" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="title">
              <Field.Label>
                <Trans message="Title" />
              </Field.Label>
              <Input required autoFocus />
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field name="description">
              <Field.Label>
                <Trans message="Description (optional)" />
              </Field.Label>
              <Textarea rows={2} />
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button
            type="submit"
            disabled={crupdateWidget.isPending || !form.formState.isDirty}
          >
            {widget ? <Trans message="Update" /> : <Trans message="Add" />}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
