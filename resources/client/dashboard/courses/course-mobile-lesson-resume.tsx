import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {PencilIcon} from 'lucide-react';

export function CourseMobileLessonResume({
  lessonTitle,
  onResume,
}: {
  lessonTitle: string;
  onResume: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-3 lg:hidden">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          <Trans message="Current lesson" />
        </p>
        <p className="truncate text-sm font-medium">{lessonTitle}</p>
      </div>
      <Button variant="outline" size="sm" type="button" onClick={onResume}>
        <PencilIcon aria-hidden="true" data-icon="inline-start" />
        <Trans message="Continue editing" />
      </Button>
    </div>
  );
}
