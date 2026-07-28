import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useEditorState} from '@tiptap/react';
import {Trans} from '@ui/i18n/trans';
import {RedoIcon, UndoIcon} from 'lucide-react';
import {useCurrentTextEditor} from './tiptap-editor-context';

export function HistoryButtons() {
  const editor = useCurrentTextEditor();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      canUndo: snapshot.editor?.can().undo(),
      canRedo: snapshot.editor?.can().redo(),
    }),
  });

  return (
    <span className="flex items-center max-md:hidden">
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              color="default"
              size="icon"
              disabled={!editor || !state?.canUndo}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.undo();
          }}
        >
          <UndoIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Undo" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              color="default"
              size="icon"
              disabled={!editor || !state?.canRedo}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.redo();
          }}
        >
          <RedoIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Redo" />
        </Tooltip.Content>
      </Tooltip.Root>
    </span>
  );
}
