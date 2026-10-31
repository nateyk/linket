import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {BackgroundSelector} from '@common/background-selector/background-selector';

export function BackgroundStyle() {
  const updateAppearance = useBiolinkEditorStore(s => s.updateAppearance);
  const value = useBiolinkEditorStore(s => s.appearance?.bgConfig);
  return (
    <BackgroundSelector
      compactTypeSelector
      tabClassName="gap-5"
      uploadType="linkImages"
      value={value}
      onChange={newValue =>
        updateAppearance({bgConfig: newValue ?? undefined})
      }
    />
  );
}
