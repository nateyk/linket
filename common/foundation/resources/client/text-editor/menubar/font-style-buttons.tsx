import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useEditorState} from '@tiptap/react';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {BoldIcon, ItalicIcon, UnderlineIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export function FontStyleButtons() {
  const editor = useCurrentTextEditor();
  const {trans} = useTrans();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      isBoldActive: snapshot.editor?.isActive('bold'),
      isItalicActive: snapshot.editor?.isActive('italic'),
      isUnderlineActive: snapshot.editor?.isActive('underline'),
    }),
  });

  // one descriptor per command, reused for the accessible name and the
  // tooltip so the two can never read differently (A-03)
  const boldLabel = message('Bold');
  const italicLabel = message('Italic');
  const underlineLabel = message('Underline');

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
              aria-label={trans(boldLabel)}
              aria-pressed={state?.isBoldActive ?? false}
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
          <Trans {...boldLabel} />
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
              aria-label={trans(italicLabel)}
              aria-pressed={state?.isItalicActive ?? false}
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
          <Trans {...italicLabel} />
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
              aria-label={trans(underlineLabel)}
              aria-pressed={state?.isUnderlineActive ?? false}
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
          <Trans {...underlineLabel} />
        </Tooltip.Content>
      </Tooltip.Root>
    </>
  );
}
