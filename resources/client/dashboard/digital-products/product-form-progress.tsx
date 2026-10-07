// resources/client/dashboard/digital-products/product-form-progress.tsx
import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';

export function ProductFormProgress({
  completed,
  total,
  label = 'Product setup',
}: {
  completed: number;
  total: number;
  label?: string;
}) {
  const {trans} = useTrans();
  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          <Trans message={label} />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans
            message=":completed of :total sections complete"
            values={{completed, total}}
          />
        </p>
      </div>
      <Progress.Root
        value={(completed / total) * 100}
        className="w-full lg:w-48"
        aria-label={trans({message: ':label progress', values: {label}})}
      >
        <Progress.Track className="h-2">
          <Progress.Indicator />
        </Progress.Track>
      </Progress.Root>
    </div>
  );
}
