import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';

/**
 * Progress measures recommended service-setup sections, not publishing
 * requirements: a valid service can be published without a cover or package.
 * FAQ and contact buttons do not change this optional setup guidance.
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
            message=":completed of :total recommended sections complete"
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