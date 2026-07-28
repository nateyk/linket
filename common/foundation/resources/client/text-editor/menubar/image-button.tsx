import {UploadType} from '@app/site-config';
import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {getImageSize} from '@ui/utils/files/get-image-size';
import {ImageUpIcon} from 'lucide-react';
import {useActiveUpload} from '../../uploads/uploader/use-active-upload';
import {useCurrentTextEditor} from '../tiptap-editor-context';

type Props = {
  uploadType: keyof typeof UploadType;
};

export function ImageButton({uploadType}: Props) {
  const editor = useCurrentTextEditor();
  const {selectAndUploadFile} = useActiveUpload();

  const handleUpload = () => {
    selectAndUploadFile({
      uploadType,
      showToastOnRestrictionFail: true,
      onSuccess: async (entry, file) => {
        if (!editor) return;
        const size = await getImageSize(file.native);
        editor.commands.focus();
        editor.commands.setImage({
          src: entry.url,
          width: size.width,
          height: size.height,
        });
      },
    });
  };

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
        onClick={handleUpload}
      >
        <ImageUpIcon />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans message="Insert image" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
