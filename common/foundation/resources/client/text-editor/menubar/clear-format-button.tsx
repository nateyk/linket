import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {RemoveFormattingIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export function ClearFormatButton() {
  const editor = useCurrentTextEditor();
  const {trans} = useTrans();

  // shared between the accessible name and the tooltip (A-03)
  const clearFormatLabel = message('Clear formatting');

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Button
            variant="ghost"
            color="default"
            size="icon-sm"
            disabled={!editor}
            aria-label={trans(clearFormatLabel)}
          />
        }
        onClick={() => {
          editor?.chain().focus().clearNodes().unsetAllMarks().run();
        }}
      >
        <RemoveFormattingIcon />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans {...clearFormatLabel} />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
