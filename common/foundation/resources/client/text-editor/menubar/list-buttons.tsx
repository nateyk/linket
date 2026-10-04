import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useEditorState} from '@tiptap/react';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ListIcon, ListOrderedIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export function ListButtons() {
  const editor = useCurrentTextEditor();
  const {trans} = useTrans();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      isBulletListActive: snapshot.editor?.isActive('bulletList'),
      isOrderedListActive: snapshot.editor?.isActive('orderedList'),
    }),
  });

  // shared between the accessible name and the tooltip (A-03)
  const bulletListLabel = message('Bulleted list');
  const orderedListLabel = message('Numbered list');

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
              aria-label={trans(bulletListLabel)}
              aria-pressed={state?.isBulletListActive ?? false}
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
          <Trans {...bulletListLabel} />
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
              aria-label={trans(orderedListLabel)}
              aria-pressed={state?.isOrderedListActive ?? false}
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
          <Trans {...orderedListLabel} />
        </Tooltip.Content>
      </Tooltip.Root>
    </>
  );
}
