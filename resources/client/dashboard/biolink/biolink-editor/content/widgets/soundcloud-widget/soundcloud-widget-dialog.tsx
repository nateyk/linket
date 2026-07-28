import {useCrupdateBiolinkWidget} from '@app/dashboard/biolink/biolink-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
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
import {CloudIcon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

export interface SoundcloudWidget extends BiolinkWidget {
  type: 'soundcloud';
  config: {
    url: string;
    embedUrl: string;
  };
}

type Props = {
  widget?: SoundcloudWidget;
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SoundcloudWidgetDialog({
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
        <SoundcloudWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SoundcloudWidgetDialogContent({
  widget,
  onClose,
}: {widget?: SoundcloudWidget; onClose: () => void}) {
  const {trans} = useTrans();
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const form = useForm<SoundcloudWidget['config']>({
    defaultValues: {
      url: widget?.config?.url ?? '',
      embedUrl: widget?.config?.embedUrl ?? '',
    },
  });

  const crupdateWidget = useCrupdateBiolinkWidget(biolinkId, form, widget?.id);
  const handleSubmit = async (values: SoundcloudWidget['config']) => {
    const encodedUrl = encodeURIComponent(values.url);
    const response = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodedUrl}`,
    ).then(res => res.json());
    const embedCode = response.html;

    const div = document.createElement('div');
    div.innerHTML = embedCode;
    const embedUrl = div.querySelector('iframe')?.src;

    if (!embedUrl) {
      form.setError('url', {
        message: trans(message('Invalid soundcloud url')),
      });
      return;
    }

    crupdateWidget.mutate(
      {
        config: {
          ...values,
          embedUrl,
        },
        type: 'soundcloud',
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
            <CloudIcon />
            <Trans message="Soundcloud Audio" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="url">
              <Field.Label>
                <Trans message="Soundcloud track url" />
              </Field.Label>
              <Input
                required
                autoFocus
                type="url"
                placeholder="https://soundcloud.com/artist/track"
              />
              <Field.Description>
                <Trans message="Embed this soundcloud track within biolink." />
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
