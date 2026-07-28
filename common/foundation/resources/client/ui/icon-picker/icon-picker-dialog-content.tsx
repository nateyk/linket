import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {IconTree} from '@ui/icons/create-svg-icon';
import IconPicker from './icon-picker';

interface IconPickerDialogProps {
  onIconSelected: (icon: IconTree[] | null) => void;
}

export function IconPickerDialogContent({
  onIconSelected,
}: IconPickerDialogProps) {
  return (
    <Dialog.Content className="w-full sm:max-w-[850px]">
      <Dialog.Header>
        <Dialog.Title>
          <Trans message="Select icon" />
        </Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <IconPicker onIconSelected={onIconSelected} />
      </Dialog.Body>
    </Dialog.Content>
  );
}
