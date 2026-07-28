import preview from '@storybook/preview';

import {Field} from '@shadcn/forms/field';
import {Select} from '@shadcn/forms/select/select';
import {Item} from '@shadcn/item/item';
import {Trans} from '@ui/i18n/trans';
import {ScanFaceIcon} from 'lucide-react';
import {useState} from 'react';

const fruits = [
  {value: 'apple', label: <Trans message="Apple" />},
  {value: 'banana', label: <Trans message="Banana" />},
  {value: 'blueberry', label: <Trans message="Blueberry" />},
  {value: 'grapes', label: <Trans message="Grapes" />},
  {value: 'pineapple', label: <Trans message="Pineapple" />},
] as const;

const frameworks = [
  {value: 'next', label: 'Next.js'},
  {value: 'sveltekit', label: 'SvelteKit'},
  {value: 'nuxt', label: 'Nuxt'},
  {value: 'remix', label: 'Remix'},
  {value: 'astro', label: 'Astro'},
] as const;

const languages = [
  {value: 'english', label: 'English'},
  {value: 'spanish', label: 'Spanish'},
  {value: 'french', label: 'French'},
  {value: 'german', label: 'German'},
  {value: 'italian', label: 'Italian'},
  {value: 'portuguese', label: 'Portuguese'},
  {value: 'polish', label: 'Polish'},
  {value: 'lithuanian', label: 'Lithuanian'},
  {value: 'japanese', label: 'Japanese'},
  {value: 'korean', label: 'Korean'},
  {value: 'ukrainian', label: 'Ukrainian'},
  {value: 'arabic', label: 'Arabic'},
] as const;

const meta = preview.meta({
  title: 'Select',
  component: Select.Root,
  tags: ['autodocs'],
});

export const Default = meta.story({
  render: function Render() {
    const [value, setValue] = useState<string | null>('apple');
    return (
      <Select.Root value={value} onValueChange={setValue} items={fruits}>
        <Select.Trigger className="w-52">
          <Select.Value placeholder="Select a fruit" />
        </Select.Trigger>
        <Select.Content>
          {fruits.map(fruit => (
            <Select.Item key={fruit.value} value={fruit.value}>
              {fruit.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    );
  },
});

export const MediaAndDescription = meta.story(() => {
  return (
    <Select.Root>
      <Select.Trigger className="w-52">
        <Select.Value placeholder="Select a fruit" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="1">Item with only text</Select.Item>
        <Select.Item value="2">
          <div className="min-w-0">
            <Trans message="Item label" />
            <p className="truncate text-xs text-muted-foreground">
              A very long description here that should be truncated, A very long
              description here that should be truncated A very long description
              here that should be truncated
            </p>
          </div>
        </Select.Item>
        <Select.Item value="3">
          <ScanFaceIcon />
          <div className="min-w-0">
            <Trans message="Label" />
            <p className="truncate">Item with media and description</p>
          </div>
        </Select.Item>
        <Select.Item value="4">
          <Item size="xs">
            <Item.Media variant="icon">
              <ScanFaceIcon />
            </Item.Media>
            <Item.Content>
              <Item.Title>
                <Trans message="Label" />
              </Item.Title>
              <Item.Description>
                Item with media and description
              </Item.Description>
            </Item.Content>
          </Item>
        </Select.Item>
      </Select.Content>
    </Select.Root>
  );
});

export const Groups = meta.story({
  render: () => (
    <Select.Root>
      <Select.Trigger className="w-56">
        <Select.Value>
          <Trans message="Select a timezone" />
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.GroupLabel>
            <Trans message="North America" />
          </Select.GroupLabel>
          <Select.Item value="est">
            <Trans message="Eastern Standard Time (EST)" />
          </Select.Item>
          <Select.Item value="cst">
            <Trans message="Central Standard Time (CST)" />
          </Select.Item>
          <Select.Item value="pst">
            <Trans message="Pacific Standard Time (PST)" />
          </Select.Item>
        </Select.Group>
        <Select.Separator />
        <Select.Group>
          <Select.GroupLabel>
            <Trans message="Europe" />
          </Select.GroupLabel>
          <Select.Item value="gmt">
            <Trans message="Greenwich Mean Time (GMT)" />
          </Select.Item>
          <Select.Item value="cet">
            <Trans message="Central European Time (CET)" />
          </Select.Item>
          <Select.Item value="eet">
            <Trans message="Eastern European Time (EET)" />
          </Select.Item>
        </Select.Group>
      </Select.Content>
    </Select.Root>
  ),
});

export const Scrollable = meta.story({
  render: () => (
    <Select.Root defaultValue="english">
      <Select.Trigger className="w-52">
        <Select.Value>
          <Trans message="Select language" />
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {languages.map(language => (
          <Select.Item key={language.value} value={language.value}>
            {language.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <Select.Root defaultValue="banana">
      <Select.Trigger disabled className="w-52">
        <Select.Value>
          <Trans message="Disabled select" />
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {fruits.map(fruit => (
          <Select.Item key={fruit.value} value={fruit.value}>
            {fruit.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  ),
});

export const Invalid = meta.story({
  render: () => (
    <Field.Root data-invalid className="w-full max-w-48">
      <Field.Label>Fruit</Field.Label>
      <Select.Root items={fruits}>
        <Select.Trigger aria-invalid>
          <Select.Value placeholder="Select a fruit" />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            {fruits.map(item => (
              <Select.Item key={item.value} value={item.value}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Content>
      </Select.Root>
      <Field.Error>Please select a fruit.</Field.Error>
    </Field.Root>
  ),
});
