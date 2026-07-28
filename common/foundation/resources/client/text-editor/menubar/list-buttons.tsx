import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useEditorState} from '@tiptap/react';
import {Trans} from '@ui/i18n/trans';
import {ListIcon, ListOrderedIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export function ListButtons() {
  const editor = useCurrentTextEditor();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      isBulletListActive: snapshot.editor?.isActive('bulletList'),
      isOrderedListActive: snapshot.editor?.isActive('orderedList'),
    }),
  });

  return (
    <>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              color={state?.isBulletListActive ? 'primary' : 'default'}
              size="icon-sm"
              disabled={!editor}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.toggleBulletList();
          }}
        >
          <ListIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Bulleted list" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              color={state?.isOrderedListActive ? 'primary' : 'default'}
              size="icon-sm"
              disabled={!editor}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.toggleOrderedList();
          }}
        >
          <ListOrderedIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Numbered list" />
        </Tooltip.Content>
      </Tooltip.Root>
    </>
  );
}
