import {Badge} from '@shadcn/badge/badge';
import {Spinner} from '@shadcn/spinner/spinner';
import preview from '@storybook/preview';
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
} from 'lucide-react';

const variants = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'ghost',
  'link',
] as const;

const meta = preview.meta({
  title: 'Badge',
  component: Badge,
  tags: ['autodocs'],
});

export const Variants = meta.story({
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {variants.map(variant => (
        <Badge key={variant} color={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
});

export const WithIcons = meta.story({
  name: 'Badges With Icons',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>
        <CheckIcon data-icon="inline-start" />
        Active
      </Badge>
      <Badge color="secondary">
        <SparklesIcon data-icon="inline-start" />
        Premium
      </Badge>
      <Badge color="destructive">
        <AlertCircleIcon data-icon="inline-start" />
        Error
      </Badge>
      <Badge color="outline">
        Pending
        <ClockIcon data-icon="inline-end" />
      </Badge>
    </div>
  ),
});

export const WithSpinner = meta.story({
  name: 'Badges With Spinner',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge color="secondary">
        <Spinner className="size-3" data-icon="inline-start" />
        Syncing
      </Badge>
      <Badge color="outline">
        <Spinner className="size-3" data-icon="inline-start" />
        Processing
      </Badge>
      <Badge color="ghost">
        Saving
        <Spinner className="size-3" data-icon="inline-end" />
      </Badge>
    </div>
  ),
});

export const LinkBadge = meta.story({
  render: () => (
    <Badge
      render={
        <a href="#link">
          Open Link <ArrowUpRightIcon data-icon="inline-end" />
        </a>
      }
    />
  ),
});

export const CustomColors = meta.story({
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge className="bg-sky-500 text-white hover:bg-sky-600">Sky</Badge>
      <Badge className="bg-violet-500 text-white hover:bg-violet-600">
        Violet
      </Badge>
      <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
        Emerald
      </Badge>
      <Badge className="bg-amber-500 text-black hover:bg-amber-600">
        Amber
      </Badge>
    </div>
  ),
});
