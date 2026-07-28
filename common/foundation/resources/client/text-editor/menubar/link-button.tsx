import {insertLinkIntoTextEditor} from '@common/text-editor/insert-link-into-text-editor';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useEditorState} from '@tiptap/react';
import {Trans} from '@ui/i18n/trans';
import {Link2Icon} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useCurrentTextEditor} from '../tiptap-editor-context';

interface FormValue {
  href: string;
  target?: string;
  text?: string;
}

const linkTargetItems = [
  {value: '_self', label: <Trans message="Current window" />},
  {value: '_blank', label: <Trans message="New window" />},
] as const;

export function LinkButton() {
  const editor = useCurrentTextEditor();
  const [open, setOpen] = useState(false);

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      href: snapshot.editor?.getAttributes('link').href || '',
    }),
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Dialog.Trigger
              render={
                <Button
                  variant="ghost"
                  color={state?.href ? 'primary' : 'default'}
                  size="icon-sm"
                  disabled={!editor}
                />
              }
            />
          }
        >
          <Link2Icon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Insert link" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <LinkDialog onSubmitSuccess={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LinkDialog({onSubmitSuccess}: {onSubmitSuccess: () => void}) {
  const editor = useCurrentTextEditor();
  const previousLink = editor?.getAttributes('link');
  const previousText = editor?.state.doc.textBetween(
    editor?.state.selection.from,
    editor?.state.selection.to,
    '',
  );

  const form = useForm<FormValue>({
    defaultValues: {
      href: previousLink?.href ?? '',
      text: previousText ?? '',
      target: previousLink?.target ?? '_blank',
    },
  });

  return (
    <HookForm.Root
      form={form}
      onSubmit={value => {
        if (!editor) return;
        insertLinkIntoTextEditor(editor, value);
        onSubmitSuccess();
      }}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Insert link" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="href">
              <Field.Label>
                <Trans message="URL" />
              </Field.Label>
              <Input type="url" required autoFocus />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="text">
              <Field.Label>
                <Trans message="Text to display" />
              </Field.Label>
              <Input required />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="target">
              <Field.Label>
                <Trans message="Open link in..." />
              </Field.Label>
              <Select.Root items={linkTargetItems}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {linkTargetItems.map(item => (
                    <Select.Item key={item.value} value={item.value}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit">
            <Trans message="Save" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
