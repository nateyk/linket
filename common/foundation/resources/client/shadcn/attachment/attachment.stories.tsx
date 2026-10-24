import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@shadcn/attachment/attachment';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FileIcon} from 'lucide-react';
import {expect} from 'storybook/test';

const meta = {
  component: Attachment,
  tags: ['ai-generated'],
} satisfies Meta<typeof Attachment>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Done: Story = {
  render: () => (
    <Attachment state="done">
      <AttachmentMedia>
        <FileIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>brief.pdf</AttachmentTitle>
        <AttachmentDescription>240 KB</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  ),
  play: async ({canvas}) => {
    await expect(canvas.getByText('brief.pdf')).toBeVisible();
    await expect(
      canvas.getByText('brief.pdf').closest('[data-slot="attachment"]'),
    ).toHaveAttribute('data-state', 'done');
  },
};

export const Uploading: Story = {
  render: () => (
    <Attachment state="uploading">
      <AttachmentMedia>
        <FileIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>photo.png</AttachmentTitle>
        <AttachmentDescription>Uploading…</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  ),
};

export const Error: Story = {
  render: () => (
    <Attachment state="error">
      <AttachmentMedia>
        <FileIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>failed.zip</AttachmentTitle>
        <AttachmentDescription>Upload failed</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Attachment state="done" orientation="vertical">
      <AttachmentMedia>
        <FileIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>cover.jpg</AttachmentTitle>
        <AttachmentDescription>1.2 MB</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  ),
};
