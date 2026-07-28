import {useCrupdateBiolinkWidget} from '@app/dashboard/biolink/biolink-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {TvMinimalPlayIcon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

export interface TwitchWidget extends BiolinkWidget {
  type: 'twitch';
  config: {
    url: string;
  };
}

type Props = {
  widget?: TwitchWidget;
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function TwitchWidgetDialog({
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
        <TwitchWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TwitchWidgetDialogContent({
  widget,
  onClose,
}: {widget?: TwitchWidget; onClose: () => void}) {
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const form = useForm<TwitchWidget['config']>({
    defaultValues: {
      url: widget?.config?.url ?? '',
    },
  });
  const crupdateWidget = useCrupdateBiolinkWidget(biolinkId, form, widget?.id);

  const handleSubmit = (values: TwitchWidget['config']) => {
    crupdateWidget.mutate(
      {
        config: values,
        type: 'twitch',
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
            <TvMinimalPlayIcon />
            <Trans message="Twitch Embed" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="url">
              <Field.Label>
                <Trans message="Twitch channel or clip url" />
              </Field.Label>
              <Input
                required
                autoFocus
                type="url"
                placeholder="https://www.twitch.tv/kasparovchess"
                pattern="https://(www.)?twitch.tv/.*"
              />
              <Field.Description>
                <Trans message="Embed this twitch channel or clip within biolink." />
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
