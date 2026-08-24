import {useCrupdateBiolinkWidget} from '@app/dashboard/stores/store-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {SiYoutube} from '@icons-pack/react-simple-icons';
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
import {useForm} from 'react-hook-form';

export interface YoutubeWidget extends BiolinkWidget {
  type: 'youtube';
  config: {
    url: string;
  };
}

type Props = {
  widget?: YoutubeWidget;
  children?: Dialog.TriggerElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function YoutubeWidgetDialog({
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
        <YoutubeWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function YoutubeWidgetDialogContent({
  widget,
  onClose,
}: {
  widget?: YoutubeWidget;
  onClose: () => void;
}) {
  const {trans} = useTrans();
  const {storeId} = useRequiredParams(['storeId']);
  const form = useForm<YoutubeWidget['config']>({
    defaultValues: {
      url: widget?.config?.url ?? '',
    },
  });

  const crupdateWidget = useCrupdateBiolinkWidget(storeId, form, widget?.id);
  const handleSubmit = (values: YoutubeWidget['config']) => {
    const youtubeId = getVideoId(values.url).id;

    if (!youtubeId) {
      form.setError('url', {
        message: trans(message('Invalid youtube url')),
      });
      return;
    }

    crupdateWidget.mutate(
      {
        config: values,
        type: 'youtube',
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
            <SiYoutube />
            <Trans message="Youtube Video" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="url">
              <Field.Label>
                <Trans message="Youtube video url" />
              </Field.Label>
              <Input
                required
                autoFocus
                type="url"
                placeholder="https://www.youtube.com/watch?v=YE7VzlLtp-4"
              />
              <Field.Description>
                <Trans message="Embed this youtube video within biolink." />
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
