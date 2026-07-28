import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {useEditorState} from '@tiptap/react';
import {ColorPickerPopover} from '@ui/color-picker/color-picker-popover';
import {BaselineIcon, PaintBucketIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export function ColorButtons() {
  const editor = useCurrentTextEditor();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      textActive: snapshot.editor?.isActive('textStyle'),
      backgroundActive: snapshot.editor?.isActive('textStyle'),
    }),
  });

  return (
    <>
      <ColorPickerPopover
        value="#000000"
        onApply={value => {
          editor?.commands.focus();
          editor?.commands.setColor(value);
        }}
      >
        <Popover.Trigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              color={state?.textActive ? 'primary' : 'default'}
              disabled={!editor}
            />
          }
        >
          <BaselineIcon />
        </Popover.Trigger>
      </ColorPickerPopover>
      <ColorPickerPopover
        value="#FFFFFF"
        onApply={value => {
          editor?.commands.focus();
          editor?.commands.setBackgroundColor(value);
        }}
      >
        <Popover.Trigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              color={state?.backgroundActive ? 'primary' : 'default'}
              disabled={!editor}
            />
          }
        >
          <PaintBucketIcon />
        </Popover.Trigger>
      </ColorPickerPopover>
    </>
  );
}
