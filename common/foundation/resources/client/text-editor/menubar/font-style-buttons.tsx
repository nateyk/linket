import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useEditorState} from '@tiptap/react';
import {Trans} from '@ui/i18n/trans';
import {BoldIcon, ItalicIcon, UnderlineIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export function FontStyleButtons() {
  const editor = useCurrentTextEditor();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      isBoldActive: snapshot.editor?.isActive('bold'),
      isItalicActive: snapshot.editor?.isActive('italic'),
      isUnderlineActive: snapshot.editor?.isActive('underline'),
    }),
  });

  return (
    <>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              color={state?.isBoldActive ? 'primary' : 'default'}
              size="icon-sm"
              disabled={!editor}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.toggleBold();
          }}
        >
          <BoldIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Bold" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              color={state?.isItalicActive ? 'primary' : 'default'}
              size="icon-sm"
              disabled={!editor}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.toggleItalic();
          }}
        >
          <ItalicIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Italic" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              color={state?.isUnderlineActive ? 'primary' : 'default'}
              size="icon-sm"
              disabled={!editor}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.toggleUnderline();
          }}
        >
          <UnderlineIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Underline" />
        </Tooltip.Content>
      </Tooltip.Root>
    </>
  );
}
