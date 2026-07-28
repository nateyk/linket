import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {
  SocialsList,
  SocialsType,
} from '@app/dashboard/biolink/biolink-editor/content/widgets/socials-widget/socials-list';
import {useCrupdateBiolinkWidget} from '@app/dashboard/biolink/biolink-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Trans} from '@ui/i18n/trans';
import {removeEmptyValuesFromObject} from '@ui/utils/objects/remove-empty-values-from-object';
import {Share2Icon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

export interface SocialsWidget extends BiolinkWidget {
  type: 'socials';
  config: Partial<Record<SocialsType, string>>;
}

type SocialsWidgetConfig = Partial<Record<SocialsType, string>>;

type Props = {
  widget?: SocialsWidget;
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SocialsWidgetDialog({
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
        <SocialsWidgetDialogContent
          widget={widget}
          onClose={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SocialsWidgetDialogContent({
  widget,
  onClose,
}: {widget?: SocialsWidget; onClose: () => void}) {
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const content = useBiolinkEditorStore(s => s.content);
  const form = useForm<SocialsWidgetConfig>({
    defaultValues: Object.fromEntries(
      Object.keys(SocialsList).map(type => [
        type,
        widget?.config?.[type as SocialsType] ?? '',
      ]),
    ) as SocialsWidgetConfig,
  });

  const crupdateWidget = useCrupdateBiolinkWidget(biolinkId, form, widget?.id);
  const handleSubmit = (values: SocialsWidgetConfig) => {
    crupdateWidget.mutate(
      {
        config: removeEmptyValuesFromObject(values),
        type: 'socials',
        ...(!widget && {position: content.length + 1}),
      },
      {
        onSuccess: () => onClose(),
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="md:max-w-2xl">
        <Dialog.Header>
          <Dialog.Title>
            <Share2Icon />
            <Trans message="Social Links" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            {Object.entries(SocialsList).map(([type, social], index) => (
              <HookForm.Field key={type} name={type}>
                <Field.Label>
                  <Trans {...social.name} />
                </Field.Label>
                <InputGroup>
                  <InputGroupInput
                    autoFocus={index === 0}
                    type={social.inputType}
                    placeholder={social.placeholder}
                    pattern={social.pattern}
                    autoComplete="off"
                  />
                  {social.icon && (
                    <InputGroupAddon align="inline-start">
                      {social.icon}
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <Field.Error />
              </HookForm.Field>
            ))}
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
