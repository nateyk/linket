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
          'compact-scrollbar flex w-112 shrink-0 flex-col items-center overflow-x-hidden overflow-y-auto border-l px-6 py-5 max-xl:hidden',
          isInsightsTab && 'hidden',
        )}
      >
        <Chip
          size="sm"
          color="positive"
          radius="rounded"
          className="mb-5 w-max shrink-0"
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
        <div className="mt-3.5 shrink-0 text-center text-sm text-muted-foreground">
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
    <div className="aspect-[9/19.5] w-full max-w-96 shrink-0 rounded-[calc(var(--radius-card)+1.5rem)] border border-foreground/20 bg-foreground/90 p-1.5">
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
