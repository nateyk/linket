import {Button} from '@shadcn/button/button';
import {Item} from '@shadcn/item/item';
import {Spinner} from '@shadcn/spinner/spinner';
import preview from '@storybook/preview';
import {LoaderIcon} from 'lucide-react';

const meta = preview.meta({
  title: 'Spinner',
  component: Spinner,
  tags: ['autodocs'],
});

export const SpinnerDemo = meta.story(() => {
  return (
    <div className="flex w-full max-w-xs flex-col gap-4 [--radius:1rem]">
      <Item variant="muted">
        <Item.Media>
          <Spinner />
        </Item.Media>
        <Item.Content>
          <Item.Title className="line-clamp-1">Processing payment...</Item.Title>
        </Item.Content>
        <Item.Content className="flex-none justify-end">
          <span className="text-sm tabular-nums">$100.00</span>
        </Item.Content>
      </Item>
    </div>
  );
});

export const SpinnerCustomIcon = meta.story(() => {
  return (
    <div className="flex items-center gap-4">
      <LoaderIcon
        role="status"
        aria-label="Loading"
        className="size-4 animate-spin"
      />
    </div>
  );
});

export const SpinnerSize = meta.story(() => {
  return (
    <div className="flex items-center gap-6">
      <Spinner className="size-3" />
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
    </div>
  );
});

export const SpinnerButton = meta.story(() => {
  return (
    <div className="flex flex-col items-center gap-4">
      <Button disabled size="sm">
        <Spinner data-icon="inline-start" />
        Loading...
      </Button>
      <Button variant="outline" disabled size="sm">
        <Spinner data-icon="inline-start" />
        Please wait
      </Button>
      <Button variant="ghost" disabled size="sm">
        <Spinner data-icon="inline-start" />
        Processing
      </Button>
    </div>
  );
});
