import {Field, FieldSet} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect} from 'storybook/test';

const meta = {
  component: Field.Root,
  tags: ['ai-generated'],
} satisfies Meta<typeof Field.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {
  render: () => (
    <Field.Root name="email" className="max-w-sm">
      <Field.Label>Email</Field.Label>
      <Input type="email" placeholder="you@example.com" />
      <Field.Description>We never share your email.</Field.Description>
    </Field.Root>
  ),
  play: async ({canvas}) => {
    await expect(canvas.getByText('Email')).toBeVisible();
    await expect(
      canvas.getByPlaceholderText('you@example.com'),
    ).toBeVisible();
  },
};

export const WithError: Story = {
  render: () => (
    <Field.Root name="username" invalid className="max-w-sm">
      <Field.Label>Username</Field.Label>
      <Input defaultValue="ab" aria-invalid />
      <Field.Error>Must be at least 3 characters.</Field.Error>
    </Field.Root>
  ),
};

export const FieldsetExample: Story = {
  render: () => (
    <FieldSet.Root className="max-w-sm">
      <FieldSet.Legend>Profile</FieldSet.Legend>
      <FieldSet.Description>Public details on your store.</FieldSet.Description>
      <Field.Group>
        <Field.Root name="displayName">
          <Field.Label>Display name</Field.Label>
          <Input placeholder="Creator name" />
        </Field.Root>
      </Field.Group>
    </FieldSet.Root>
  ),
};
