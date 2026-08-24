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
import {Music4Icon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

export interface TiktokWidget extends BiolinkWidget {
  type: 'tiktok';
  config: {
    url: string;
  };
}

type Props = {
  widget?: TiktokWidget;
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function TiktokWidgetDialog({
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
        <TiktokWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TiktokWidgetDialogContent({
  widget,
  onClose,
}: {widget?: TiktokWidget; onClose: () => void}) {
  const {trans} = useTrans();
  const {storeId} = useRequiredParams(['storeId']);
  const form = useForm<TiktokWidget['config']>({
    defaultValues: {
      url: widget?.config?.url ?? '',
    },
  });

  const crupdateWidget = useCrupdateBiolinkWidget(storeId, form, widget?.id);
  const handleSubmit = (values: TiktokWidget['config']) => {
    if (!values.url.includes('tiktok.com/')) {
      form.setError('url', {
        message: trans(message('Invalid tiktok url')),
      });
      return;
    }

    crupdateWidget.mutate(
      {
        config: values,
        type: 'tiktok',
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
            <Music4Icon />
            <Trans message="TikTok Embed" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="url">
              <Field.Label>
                <Trans message="Tiktok url" />
              </Field.Label>
              <Input
                required
                autoFocus
                type="url"
                placeholder="https://www.tiktok.com/@bts_official_bighit/video/6964945720885464322"
              />
              <Field.Description>
                <Trans message="Embed this tiktok video within biolink." />
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
