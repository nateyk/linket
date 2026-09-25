import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {BiolinkLayout} from '@app/short-links/renderers/biolink-renderer/biolink-layout';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {Activity, ReactNode} from 'react';
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
        <div className="mb-2.5 inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground shadow-xs">
          <Trans message="Live preview" />
        </div>
        <PhoneSkeleton>
          <BiolinkLayout
            biolink={biolink as any}
            content={content}
            appearance={appearance}
            className="h-full"
            isPreview
            creatorProfileOnly
            profileConfig={profileConfig}
          />
        </PhoneSkeleton>
      </div>
    </Activity>
  );
}

interface PhoneSkeletonProps {
  children: ReactNode;
}
function PhoneSkeleton({children}: PhoneSkeletonProps) {
  return (
    <div className="relative aspect-[9/16] w-full max-w-64 shrink-0 rounded-[2rem] border border-foreground/20 bg-foreground/80 p-[3px] shadow-lg shadow-foreground/10 ring-1 ring-border/50 sm:max-w-72 lg:max-w-76">
      <div className="pointer-events-none absolute top-2.5 left-1/2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-background/25 shadow-inner" />
      <div className="compact-scrollbar size-full overflow-x-hidden overflow-y-auto rounded-[1.7rem] bg-background">
        {children}
      </div>
    </div>
  );
}
