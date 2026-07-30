import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {appearanceHeaderClassnames} from '@app/dashboard/biolink/biolink-editor/appearance/header-classnames';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Trans} from '@ui/i18n/trans';
import {LayoutPanelLeftIcon, LayoutPanelTopIcon} from 'lucide-react';

type LayoutValue = NonNullable<BiolinkAppearanceConfig['layout']>;

export function LayoutStyle() {
  const updateAppearance = useBiolinkEditorStore(s => s.updateAppearance);
  const currentValue =
    useBiolinkEditorStore(s => s.appearance?.layout) ?? 'default';

  return (
    <div>
      <h2 className={appearanceHeaderClassnames.h2}>
        <Trans message="Layout" />
      </h2>
      <p className="text-sm text-muted-foreground">
        <Trans message="Choose how your bio link content is arranged." />
      </p>

      <RadioGroup
        value={currentValue}
        onValueChange={(value: string) => {
          updateAppearance({layout: value as LayoutValue});
        }}
        className="mt-4 flex flex-col gap-3"
      >
        <label
          htmlFor="layout-default"
          className="flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors hover:bg-muted/40"
        >
          <RadioGroupItem value="default" id="layout-default" className="mt-3" />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-muted/50 text-muted-foreground">
              <LayoutPanelTopIcon className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                <Trans message="Standard" />
              </div>
              <p className="text-sm text-muted-foreground">
                <Trans message="Profile and links in a single column." />
              </p>
            </div>
          </div>
        </label>

        <label
          htmlFor="layout-sidebar"
          className="flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors hover:bg-muted/40"
        >
          <RadioGroupItem
            value="profile-sidebar"
            id="layout-sidebar"
            className="mt-3"
          />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-muted/50 text-muted-foreground">
              <LayoutPanelLeftIcon className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                <Trans message="Profile sidebar" />
              </div>
              <p className="text-sm text-muted-foreground">
                <Trans message="Profile on the left, links and content on the right." />
              </p>
            </div>
          </div>
        </label>
      </RadioGroup>
    </div>
  );
}
