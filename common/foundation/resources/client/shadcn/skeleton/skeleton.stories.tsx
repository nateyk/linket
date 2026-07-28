import {Card} from '@shadcn/card/card';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import preview from '@storybook/preview';

const meta = preview.meta({
  title: 'Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
});

export const SkeletonDemo = meta.story(() => {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
});

export const SkeletonCard = meta.story(() => {
  return (
    <Card className="w-full max-w-xs">
      <Card.Header>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </Card.Header>
      <Card.Content>
        <Skeleton className="aspect-video w-full" />
      </Card.Content>
    </Card>
  );
});

export const SkeletonText = meta.story(() => {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
});

export const SkeletonTable = meta.story(() => {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {Array.from({length: 5}).map((_, index) => (
        <div className="flex gap-4" key={index}>
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
});
