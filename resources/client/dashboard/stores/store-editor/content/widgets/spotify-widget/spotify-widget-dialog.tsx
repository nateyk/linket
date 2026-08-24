import {useCrupdateBiolinkWidget} from '@app/dashboard/stores/store-editor/content/widgets/use-crupdate-biolink-widget';
import {parse} from '@app/dashboard/stores/store-editor/content/widgets/spotify-widget/spotify-uri';
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
import {Music2Icon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

export interface SpotifyWidget extends BiolinkWidget {
  type: 'spotify';
  config: {
    url: string;
    type?: string;
  };
}

type Props = {
  widget?: SpotifyWidget;
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SpotifyWidgetDialog({
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
        <SpotifyWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SpotifyWidgetDialogContent({
  widget,
  onClose,
}: {widget?: SpotifyWidget; onClose: () => void}) {
  const {trans} = useTrans();
  const {storeId} = useRequiredParams(['storeId']);
  const form = useForm<SpotifyWidget['config']>({
    defaultValues: {
      url: widget?.config?.url ?? '',
      type: widget?.config?.type,
    },
  });
  const crupdateWidget = useCrupdateBiolinkWidget(storeId, form, widget?.id);

  const handleSubmit = (values: SpotifyWidget['config']) => {
    const spotifyInfo = parse(values.url);

    if (!('id' in spotifyInfo)) {
      form.setError('url', {
        message: trans(message('Invalid spotify url')),
      });
      return;
    }

    crupdateWidget.mutate(
      {
        config: {
          ...values,
          type: spotifyInfo.type,
        },
        type: 'spotify',
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
            <Music2Icon />
            <Trans message="Spotify Embed" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="url">
              <Field.Label>
                <Trans message="Spotify share url" />
              </Field.Label>
              <Input
                required
                autoFocus
                type="url"
                placeholder="https://open.spotify.com/track/2sqfLwGKXDw1nGjFhH3GGX?si=f329040f45804ec5"
              />
              <Field.Description>
                <Trans message="Any share url from spotify can be used, including artist, album, track, playlist etc." />
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
