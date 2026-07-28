import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {CodeIcon} from 'lucide-react';
import {AceDialog} from '../ace-editor/ace-dialog';
import {useCurrentTextEditor} from './tiptap-editor-context';

export function ModeButton() {
  const editor = useCurrentTextEditor();
  return (
    <Tooltip.Root>
      <AceDialog
        title={<Trans message="Source code" />}
        defaultValue={editor?.getHTML() ?? ''}
        onSave={newValue => {
          if (newValue != null) {
            editor?.commands.setContent(newValue);
          }
        }}
      >
        <Dialog.Trigger
          disabled={!editor}
          className="max-md:hidden"
          render={
            <Tooltip.Trigger
              render={<Button variant="ghost" color="default" size="icon-sm" />}
            />
          }
        >
          <CodeIcon />
        </Dialog.Trigger>
      </AceDialog>
      <Tooltip.Content>
        <Trans message="Source code" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
