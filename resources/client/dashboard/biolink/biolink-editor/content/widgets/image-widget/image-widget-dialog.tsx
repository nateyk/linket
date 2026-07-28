import {useCrupdateBiolinkWidget} from '@app/dashboard/biolink/biolink-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ImageIcon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm, useWatch} from 'react-hook-form';

export interface ImageWidget extends BiolinkWidget {
  type: 'image';
  config: {
    url: string;
    destinationUrl?: string;
    type: 'default' | 'avatar';
  };
}

type Props = {
  widget?: ImageWidget;
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ImageWidgetDialog({
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
        <ImageWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ImageWidgetDialogContent({
  widget,
  onClose,
}: {
  widget?: ImageWidget;
  onClose: () => void;
}) {
  const {trans} = useTrans();
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const form = useForm<ImageWidget['config']>({
    defaultValues: {
      url: widget?.config?.url ?? '',
      destinationUrl: widget?.config?.destinationUrl ?? '',
      type: widget?.config?.type ?? 'avatar',
    },
  });
  const urlValue = useWatch({control: form.control, name: 'url'});

  const crupdateWidget = useCrupdateBiolinkWidget(biolinkId, form, widget?.id);
  const handleSubmit = (values: ImageWidget['config']) => {
    crupdateWidget.mutate(
      {
        config: values,
        type: 'image',
      },
      {
        onSuccess: () => onClose(),
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  const styleItems = [
    {value: 'default', label: <Trans message="Default" />},
    {value: 'avatar', label: <Trans message="Avatar" />},
  ];

  return (
    <FileUploadProvider>
      <HookForm.Root form={form} onSubmit={handleSubmit}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              <ImageIcon />
              <Trans message="Image" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Field.Group>
              <Field.Root name="url">
                <Field.Label>
                  <Trans message="File" />
                </Field.Label>
                <ImageSelector.Input
                  value={urlValue}
                  onChange={value =>
                    form.setValue('url', value, {shouldDirty: true})
                  }
                  uploadType="linkImages"
                  required
                />
                <Field.Error />
              </Field.Root>

              <HookForm.Field name="type">
                <Field.Label>
                  <Trans message="Style" />
                </Field.Label>
                <Select.Root items={styleItems}>
                  <Select.Trigger className="w-full">
                    <Select.Value
                      placeholder={<Trans message="Select style" />}
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {styleItems.map(item => (
                      <Select.Item key={item.value} value={item.value}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Field.Error />
              </HookForm.Field>
              <HookForm.Field name="destinationUrl">
                <Field.Label>
                  <Trans message="Destination url" />
                </Field.Label>
                <Input type="url" placeholder={trans(message('Optional'))} />
                <Field.Description>
                  <Trans message="Redirect user to this url when clicking the image." />
                </Field.Description>
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
    </FileUploadProvider>
  );
}
