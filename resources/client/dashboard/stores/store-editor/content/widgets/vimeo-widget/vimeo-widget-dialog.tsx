import {useCrupdateBiolinkWidget} from '@app/dashboard/stores/store-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import getVideoId from 'get-video-id';
import {VideoIcon} from 'lucide-react';
import {useForm} from 'react-hook-form';

const VIMEO_WIDGET_TYPE = 'vimeo';

export interface VimeoWidget extends BiolinkWidget {
  type: typeof VIMEO_WIDGET_TYPE;
  config: {
    url: string;
  };
}

type Props = {
  widget?: VimeoWidget;
  children?: Dialog.TriggerElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function VimeoWidgetDialog({
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
        <VimeoWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function VimeoWidgetDialogContent({
  widget,
  onClose,
}: {widget?: VimeoWidget; onClose: () => void}) {
  const {trans} = useTrans();
  const {storeId} = useRequiredParams(['storeId']);
  const form = useForm<VimeoWidget['config']>({
    defaultValues: {
      url: widget?.config?.url ?? '',
    },
  });

  const crupdateWidget = useCrupdateBiolinkWidget(storeId, form, widget?.id);
  const handleSubmit = (values: VimeoWidget['config']) => {
    const vimeoId = getVideoId(values.url).id;

    if (!vimeoId) {
      form.setError('url', {
        message: trans(message('Invalid vimeo url')),
      });
      return;
    }

    crupdateWidget.mutate(
      {
        config: values,
        type: VIMEO_WIDGET_TYPE,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <VideoIcon />
            <Trans message="Vimeo Video" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="url">
              <Field.Label>
                <Trans message="Vimeo video url" />
              </Field.Label>
              <Input
                required
                autoFocus
                type="url"
                placeholder="https://vimeo.com/1084537"
              />
              <Field.Description>
                <Trans message="Embed this vimeo video within biolink." />
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
  );
}
