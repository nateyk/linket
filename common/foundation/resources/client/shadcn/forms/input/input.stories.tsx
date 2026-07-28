import {Button} from '@shadcn/button/button';
import {ButtonGroup} from '@shadcn/button-group/button-group';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import preview from '@storybook/preview';
import {InfoIcon} from 'lucide-react';
import {Trans} from '@ui/i18n/trans';

const meta = preview.meta({
  title: 'Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Type here...',
  },
});

export const InputFieldExample = meta.story({
  render: () => (
    <div>
      <Field.Root>
        <Field.Label>
          <Trans message="API Key" />
        </Field.Label>
        <Input type="email" placeholder="SK-..." />
        <Field.Description>
          <Trans message="Your API key is encrypted and stored securely." />
        </Field.Description>
      </Field.Root>
    </div>
  ),
});

export const InputFieldGroup = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Field.Group>
        <Field.Root>
          <Field.Label>Name</Field.Label>
          <Input placeholder="Jordan Lee" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input type="email" placeholder="name@example.com" />
          <Field.Description>
            We&apos;ll send updates to this address.
          </Field.Description>
        </Field.Root>
        <Field.Root orientation="horizontal">
          <Button type="reset" variant="outline">
            Reset
          </Button>
          <Button type="submit">Submit</Button>
        </Field.Root>
      </Field.Group>
    </div>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <div className="max-w-xs">
      <Field.Root data-disabled="true">
        <Field.Label htmlFor="disabled-input">
          <Trans message="Disabled Input" />
        </Field.Label>
        <Input id="disabled-input" disabled placeholder="Unavailable value" />
        <Field.Description>
          <Trans message="This input is currently disabled." />
        </Field.Description>
      </Field.Root>
    </div>
  ),
});

export const Invalid = meta.story({
  render: () => (
    <div className="max-w-xs">
      <Field.Root data-invalid="true">
        <Field.Label htmlFor="invalid-input">
          <Trans message="Email address" />
        </Field.Label>
        <Input
          id="invalid-input"
          type="email"
          aria-invalid
          placeholder="name@example.com"
        />
        <Field.Error>
          <Trans message="Please enter a valid email address." />
        </Field.Error>
      </Field.Root>
    </div>
  ),
});

export const File = meta.story({
  render: () => (
    <div className="max-w-xs">
      <Field.Root>
        <Field.Label htmlFor="file-input">
          <Trans message="Upload file" />
        </Field.Label>
        <Input id="file-input" type="file" />
        <Field.Description>
          <Trans message="Select a file from your device." />
        </Field.Description>
      </Field.Root>
    </div>
  ),
});

export const Inline = meta.story({
  render: () => (
    <div className="max-w-xs">
      <Field.Root orientation="horizontal">
        <Field.Label htmlFor="search-input" className="sr-only">
          <Trans message="Search" />
        </Field.Label>
        <Input id="search-input" placeholder="Search..." />
        <Button type="button">
          <Trans message="Search" />
        </Button>
      </Field.Root>
    </div>
  ),
});

export const Grid = meta.story({
  render: () => (
    <div className="grid max-w-xl gap-4 sm:grid-cols-2">
      <Field.Root>
        <Field.Label htmlFor="grid-first-name">
          <Trans message="First name" />
        </Field.Label>
        <Input id="grid-first-name" placeholder="Jordan" />
      </Field.Root>
      <Field.Root>
        <Field.Label htmlFor="grid-last-name">
          <Trans message="Last name" />
        </Field.Label>
        <Input id="grid-last-name" placeholder="Lee" />
      </Field.Root>
      <Field.Root className="sm:col-span-2">
        <Field.Label htmlFor="grid-email">
          <Trans message="Email" />
        </Field.Label>
        <Input id="grid-email" type="email" placeholder="jordan@example.com" />
      </Field.Root>
    </div>
  ),
});

export const Required = meta.story({
  render: () => (
    <div className="max-w-xs">
      <Field.Root>
        <Field.Label htmlFor="required-input">
          <Trans message="Workspace name" />
          <span className="text-destructive">*</span>
        </Field.Label>
        <Input id="required-input" required placeholder="Belink Team" />
        <Field.Description>
          <Trans message="This field is required." />
        </Field.Description>
      </Field.Root>
    </div>
  ),
});

export const InputGroupExample = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Field.Root>
        <Field.Label htmlFor="input-group-url">Website URL</Field.Label>
        <InputGroup>
          <InputGroupInput id="input-group-url" placeholder="example.com" />
          <InputGroupAddon>
            <InputGroupText>https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <InfoIcon />
          </InputGroupAddon>
        </InputGroup>
      </Field.Root>
    </div>
  ),
});

export const InputButtonGroup = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Field.Root>
        <Field.Label htmlFor="input-button-group">Search</Field.Label>
        <ButtonGroup>
          <Input id="input-button-group" placeholder="Type to search..." />
          <Button variant="outline" color="default">
            Search
          </Button>
        </ButtonGroup>
      </Field.Root>
    </div>
  ),
});

export const Sizes = meta.story({
  render: () => (
    <div className="grid w-md gap-3">
      <Input placeholder="Extra small input" className="h-6 px-2" />
      <Input placeholder="Small input" className="h-8" />
      <Input placeholder="Default input" />
      <Input placeholder="Large input" className="h-11" />
    </div>
  ),
});

export const Default = meta.story({
  render: args => (
    <div className="max-w-xs">
      <Input {...args} />
    </div>
  ),
});
