import {Button} from '@shadcn/button/button';
import preview from '@storybook/preview';
import {PlusIcon} from 'lucide-react';

const variants = ['default', 'outline', 'ghost', 'link'] as const;

const colors = ['default', 'primary', 'danger', 'positive'] as const;

const sizes = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
] as const;

const DemoIcon = () => <PlusIcon />;

const meta = preview.meta({
  title: 'Button',
  component: Button,
  args: {
    children: 'Button',
    variant: 'default',
    color: 'primary',
    size: 'default',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: variants,
    },
    size: {
      control: 'select',
      options: sizes,
    },
    color: {
      control: 'inline-radio',
      options: colors,
    },
  },
});

export const Default = meta.story();

function renderVariantWithAllColors(variant: (typeof variants)[number]) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {colors.map(color => (
        <Button
          key={color}
          variant={variant}
          color={color}
          className="capitalize"
        >
          {color}
        </Button>
      ))}
      <Button variant={variant} color="primary">
        <DemoIcon />
        Primary with icon
      </Button>
    </div>
  );
}

export const VariantDefault = meta.story({
  name: 'Default Variant',
  render: () => renderVariantWithAllColors('default'),
});

export const Outline = meta.story({
  render: () => renderVariantWithAllColors('outline'),
});

export const Ghost = meta.story({
  render: () => renderVariantWithAllColors('ghost'),
});

export const Link = meta.story({
  render: () => renderVariantWithAllColors('link'),
});

export const AllSizes = meta.story({
  render: () => (
    <div className="flex flex-col gap-3">
      {sizes.map(size => {
        const isIcon = size.startsWith('icon');
        return (
          <div key={size} className="flex items-center gap-3">
            <div className="w-20 text-sm text-foreground capitalize">
              {size}
            </div>
            <Button size={size}>
              {isIcon ? <DemoIcon /> : null}
              {isIcon ? null : `Size ${size}`}
            </Button>
          </div>
        );
      })}
    </div>
  ),
});

export const InvalidButton = meta.story({
  render: () => (
    <div className="flex flex-col gap-3">
      <Button aria-invalid="true" variant="ghost" color="primary">
        Invalid Button
      </Button>
    </div>
  ),
});
