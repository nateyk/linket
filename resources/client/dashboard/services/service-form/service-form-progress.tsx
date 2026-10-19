import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';

/**
 * Progress for the service form counts only the sections a published service
 * needs; optional sections (FAQ, contact buttons) never move the bar, so a
 * creator is never told they are unfinished for leaving something out.
 */
export function ServiceFormProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const {trans} = useTrans();
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          <Trans message="Service setup" />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans
            message=":completed of :total required sections complete"
            values={{completed, total}}
          />
        </p>
      </div>
      <Progress.Root
        value={percent}
        className="w-full lg:w-48"
        aria-label={trans({message: 'Service setup progress'})}
      >
        <Progress.Track className="h-2">
          <Progress.Indicator />
        </Progress.Track>
      </Progress.Root>
    </div>
  );
}