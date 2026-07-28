import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {useEditorState} from '@tiptap/react';
import {Trans} from '@ui/i18n/trans';
import {
  CircleAlertIcon,
  MinusIcon,
  MoreVerticalIcon,
  SquarePlayIcon,
  StickyNoteIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useCurrentTextEditor} from '../tiptap-editor-context';

type InfoBlockType = 'important' | 'warning' | 'success';

export function InsertMenuTrigger() {
  const editor = useCurrentTextEditor();
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);

  const focusAndRun = (command: () => void) => {
    editor?.commands.focus();
    command();
  };

  const addInfo = (type: InfoBlockType) => {
    focusAndRun(() => editor?.commands.addInfo({type}));
  };

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button
              variant="ghost"
              color="default"
              size="icon-sm"
              disabled={!editor}
            />
          }
        >
          <MoreVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item
            onClick={() =>
              focusAndRun(() => editor?.commands.setHorizontalRule())
            }
          >
            <MinusIcon />
            <Trans message="Horizontal rule" />
          </Dropdown.Item>
          <Dropdown.Item onClick={() => setEmbedDialogOpen(true)}>
            <SquarePlayIcon />
            <Trans message="Embed" />
          </Dropdown.Item>
          <Dropdown.Item onClick={() => addInfo('important')}>
            <CircleAlertIcon />
            <Trans message="Important" />
          </Dropdown.Item>
          <Dropdown.Item onClick={() => addInfo('warning')}>
            <TriangleAlertIcon />
            <Trans message="Warning" />
          </Dropdown.Item>
          <Dropdown.Item onClick={() => addInfo('success')}>
            <StickyNoteIcon />
            <Trans message="Note" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      <Dialog.Root open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <EmbedDialog onSubmitSuccess={() => setEmbedDialogOpen(false)} />
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function EmbedDialog({onSubmitSuccess}: {onSubmitSuccess: () => void}) {
  const editor = useCurrentTextEditor();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      src: snapshot.editor?.getAttributes('embed').src || '',
    }),
  });

  const form = useForm<{src: string}>({
    defaultValues: {src: state?.src ?? ''},
  });

  return (
    <HookForm.Root
      form={form}
      onSubmit={value => {
        editor?.commands.setEmbed(value);
        onSubmitSuccess();
      }}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Embed" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <HookForm.Field name="src">
            <Field.Label>
              <Trans message="Embed URL" />
            </Field.Label>
            <Input type="url" required autoFocus />
            <Field.Error />
          </HookForm.Field>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
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
