import { Button } from '@shadcn/button/button';
import { Tooltip } from '@shadcn/tooltip/tooltip';
import { useEditorState } from '@tiptap/react';
import { Trans } from '@ui/i18n/trans';
import { IndentDecreaseIcon, IndentIncreaseIcon } from 'lucide-react';
import { useCurrentTextEditor } from '../tiptap-editor-context';

export function IndentButtons() {
  const editor = useCurrentTextEditor();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      isOutdentActive: snapshot.editor?.isActive('outdent'),
      isIndentActive: snapshot.editor?.isActive('indent'),
    }),
  });

  return (
    <span className="shrink-0 whitespace-nowrap">
      <Tooltip.Root>
        <Tooltip.Trigger

          render={
            <Button
              variant="ghost"
              size="icon-sm"
              color={state?.isOutdentActive ? 'primary' : 'default'}
              disabled={!editor}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.outdent();
          }}
        >
          <IndentDecreaseIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Decrease indent" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger

          render={
            <Button
              variant="ghost"
              size="icon-sm"
              color={state?.isIndentActive ? 'primary' : 'default'}
              disabled={!editor}
            />
          }
          onClick={() => {
            editor?.commands.focus();
            editor?.commands.indent();
          }}
        >
          <IndentIncreaseIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Increase indent" />
        </Tooltip.Content>
      </Tooltip.Root>
    </span>
  );
}
