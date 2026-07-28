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

  const {pathname} = useLocation();
  const isInsightsTab = pathname.split('/').pop() === 'insights';

  return (
    <Activity>
      <div
        className={cn(
          'compact-scrollbar shrink-0 overflow-x-hidden overflow-y-auto border-l p-6 max-xl:hidden',
          isInsightsTab && 'hidden',
        )}
      >
        <Chip
          size="sm"
          color="positive"
          radius="rounded"
          className="m-auto mb-6 w-max"
        >
          <Trans message="Live preview" />
        </Chip>
        <PhoneSkeleton>
          <BiolinkLayout
            biolink={biolink}
            content={content}
            appearance={appearance}
            className="h-full"
          />
        </PhoneSkeleton>
        <div className="mt-3.5 text-center text-sm text-muted-foreground">
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
    <div className="h-181 w-87.5 overflow-hidden rounded-[64px] border-12 border-[#444546] shadow-lg">
      {children}
    </div>
  );
}
