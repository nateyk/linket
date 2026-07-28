import {appearanceHeaderClassnames} from '@app/dashboard/biolink/biolink-editor/appearance/header-classnames';
import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {BackgroundSelector} from '@common/background-selector/background-selector';
import {Trans} from '@ui/i18n/trans';

export function BackgroundStyle() {
  const updateAppearance = useBiolinkEditorStore(s => s.updateAppearance);
  const value = useBiolinkEditorStore(s => s.appearance?.bgConfig);
  return (
    <div>
      <h2 className={appearanceHeaderClassnames.h2}>
        <Trans message="Background" />
      </h2>
      <BackgroundSelector
        uploadType="linkImages"
        value={value}
        onChange={newValue =>
          updateAppearance({bgConfig: newValue ?? undefined})
        }
      />
    </div>
  );
}
