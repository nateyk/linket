import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {BiolinkLayout} from '@app/short-links/renderers/biolink-renderer/biolink-layout';
import {Chip} from '@ui/forms/input-field/chip-field/chip';
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
          'flex w-full min-w-0 shrink-0 flex-col items-center overflow-x-hidden border-t bg-background px-4 py-5 lg:w-[min(34vw,26rem)] lg:min-w-84 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:px-5 lg:py-5',
          isInsightsTab && 'hidden',
        )}
      >
        <Chip
          size="sm"
          color="positive"
          radius="rounded"
          className="mb-4 w-max shrink-0"
        >
          <Trans message="Live preview" />
        </Chip>
        <PhoneSkeleton>
          <BiolinkLayout
            biolink={biolink}
            content={content}
            appearance={appearance}
            className="h-full"
            isPreview
            creatorProfileOnly
            profileConfig={profileConfig}
          />
        </PhoneSkeleton>
        <div className="mt-3 shrink-0 text-center text-xs text-muted-foreground">
          <Trans message="Scheduled and disabled content is not shown" />
        </div>
      </div>
    </Activity>
  );
}

interface PhoneSkeletonProps {
  children: ReactNode;
}
function PhoneSkeleton({children}: PhoneSkeletonProps) {
  return (
    <div className="aspect-[9/19.5] w-full max-w-64 shrink-0 rounded-[calc(var(--radius-card)+1.5rem)] border border-foreground/20 bg-foreground/90 p-1.5 sm:max-w-72 lg:max-w-96">
      <div className="flex size-full flex-col overflow-hidden rounded-[calc(var(--radius-card)+1rem)] bg-background">
        <div className="flex h-8 shrink-0 items-center justify-center bg-foreground/90">
          <div className="h-3.5 w-22 rounded-full bg-background/15" />
        </div>
        <div className="compact-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
