import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {ReactElement, useState} from 'react';
import {useForm} from 'react-hook-form';

interface FormValue {
  key: string;
  value: string;
}

type NewTranslationDialogProps = {
  children: ReactElement<typeof Dialog.Trigger>;
  onAdd: (translation: FormValue) => void;
};

export function NewTranslationDialog({children, onAdd}: NewTranslationDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          onClose={() => setOpen(false)}
          onAdd={translation => {
            onAdd(translation);
            setOpen(false);
          }}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (translation: FormValue) => void;
}) {
  const form = useForm<FormValue>();

  return (
    <HookForm.Root
      form={form}
      onSubmit={values => {
        onAdd(values);
      }}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Add translation" />
          </Dialog.Title>
          <Dialog.Description>
            <Trans message="Add a new translation, if it does not exist already. This should only need to be done for things like custom menu items." />
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="key">
              <Field.Label>
                <Trans message="Translation key" />
              </Field.Label>
              <Textarea autoFocus rows={2} required />
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field name="value">
              <Field.Label>
                <Trans message="Translation value" />
              </Field.Label>
              <Textarea rows={2} required />
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton onClick={onClose}>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit">
            <Trans message="Add" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
