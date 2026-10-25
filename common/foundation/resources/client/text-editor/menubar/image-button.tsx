import {UploadType} from '@app/site-config';
import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {getImageSize} from '@ui/utils/files/get-image-size';
import {ImageUpIcon} from 'lucide-react';
import {ComponentProps} from 'react';
import {useActiveUpload} from '../../uploads/uploader/use-active-upload';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export const TwoMB = 2 * 1024 * 1024;

type Props = {
  uploadType: keyof typeof UploadType;
  size?: ComponentProps<typeof Button>['size'];
  iconSize?: 'sm' | 'md' | 'lg';
};

export function ImageButton({
  uploadType,
  size = 'icon-sm',
  iconSize = 'sm',
}: Props) {
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
            size={size}
            disabled={!editor}
          />
        }
        onClick={handleUpload}
      >
        <ImageUpIcon
          className={
            iconSize === 'lg' ? 'size-5' : iconSize === 'md' ? 'size-4.5' : 'size-4'
          }
        />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans message="Insert image" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
