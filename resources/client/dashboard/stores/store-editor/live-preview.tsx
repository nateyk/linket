import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {PhonePreview} from '@app/dashboard/stores/store-editor/phone-preview';
import {Background} from '@app/short-links/renderers/biolink-renderer/biolink-background';
import {BiolinkLayout} from '@app/short-links/renderers/biolink-renderer/biolink-layout';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {Activity} from 'react';
import {useLocation} from 'react-router';

export function LivePreview() {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const appearance = useBiolinkEditorStore(s => s.appearance);
  const content = useBiolinkEditorStore(s => s.content);
  const profileConfig = useBiolinkEditorStore(s => s.profileConfig);

  const {pathname} = useLocation();
  const isInsightsTab = pathname.split('/').pop() === 'insights';

  return (
    <Activity>
      <div
        className={cn(
          'flex w-full min-w-0 shrink-0 flex-col items-center overflow-x-hidden border-t bg-background px-4 py-5 lg:w-[min(36vw,28rem)] lg:min-w-88 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:px-6 lg:py-5',
          isInsightsTab && 'hidden',
        )}
      >
        <div className="mb-2.5 inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground shadow-xs select-none">
          <Trans message="Live preview" />
        </div>
        <PhonePreview
          className="w-full max-w-64 sm:max-w-72 lg:max-w-76"
          background={<Background appearance={appearance} />}
        >
          <BiolinkLayout
            biolink={biolink as any}
            content={content}
            appearance={appearance}
            className="h-full"
            isPreview
            creatorProfileOnly
            profileConfig={profileConfig}
          />
        </PhonePreview>
      </div>
    </Activity>
  );
}
