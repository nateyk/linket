import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {RemoveFormattingIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export function ClearFormatButton() {
  const editor = useCurrentTextEditor();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Button
            variant="ghost"
            color="default"
            size="icon-sm"
            disabled={!editor}
          />
        }
        onClick={() => {
          editor?.chain().focus().clearNodes().unsetAllMarks().run();
        }}
      >
        <RemoveFormattingIcon />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans message="Clear formatting" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
