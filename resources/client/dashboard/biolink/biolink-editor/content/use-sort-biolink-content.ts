import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {changeBiolinkContentOrder} from '@app/gen/biolinks';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useMutation} from '@tanstack/react-query';
import {moveItemInNewArray} from '@ui/utils/array/move-item-in-new-array';

interface Payload {
  oldIndex: number;
  newIndex: number;
  // id of widget that should be pinned to top
  widgetToPin?: number;
}

export function useSortBiolinkContent() {
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const getState = useBiolinkEditorStore(s => s.getState);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);
  return useMutation({
    mutationFn: ({oldIndex, newIndex, widgetToPin}: Payload) => {
      const oldContent = getState().content;

      const newContent = moveItemInNewArray(oldContent, oldIndex, newIndex);
      if (widgetToPin) {
        newContent[newIndex] = {
          ...newContent[newIndex]!,
          pinned: 'top',
        } as BiolinkWidget;
      }
      overrideContent(newContent);

      const order = newContent.map(item => ({
        id: item.id,
        model_type: item.model_type,
      }));

      return changeBiolinkContentOrder(Number(biolinkId), {
        order,
        widgetToPin,
      });
    },
  });
}
