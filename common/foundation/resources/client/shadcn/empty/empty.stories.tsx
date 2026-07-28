import preview from '@storybook/preview';

import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Kbd} from '@shadcn/kbd';
import {
  ArrowUpRightIcon,
  CloudIcon,
  FolderCodeIcon,
  SearchIcon,
} from 'lucide-react';

const meta = preview.meta({
  title: 'Empty',
  component: Empty.Root,
  subcomponents: {
    Header: Empty.Header,
    Media: Empty.Media,
    Title: Empty.Title,
    Description: Empty.Description,
    Content: Empty.Content,
  },
});

export const Default = meta.story({
  render: () => (
    <div className="w-full max-w-sm">
      <Empty>
        <Empty.Header>
          <Empty.Media variant="icon">
            <FolderCodeIcon />
          </Empty.Media>
          <Empty.Title>No Projects Yet</Empty.Title>
          <Empty.Description>
            You haven&apos;t created any projects yet. Get started by creating
            your first project.
          </Empty.Description>
        </Empty.Header>
        <Empty.Content className="flex-row justify-center gap-2">
          <Button>Create Project</Button>
          <Button variant="outline">Import Project</Button>
        </Empty.Content>
        <Button
          variant="link"
          className="text-muted-foreground"
          size="sm"
          nativeButton={false}
          render={
            <a href="#">
              Learn More <ArrowUpRightIcon />
            </a>
          }
        />
      </Empty>
    </div>
  ),
});

/**
 * Use the `border` utility class to create an outline empty state.
 */
export const EmptyOutline = meta.story(() => {
  return (
    <Empty className="border border-dashed">
      <Empty.Header>
        <Empty.Media variant="icon">
          <CloudIcon />
        </Empty.Media>
        <Empty.Title>Cloud Storage Empty</Empty.Title>
        <Empty.Description>
          Upload files to your cloud storage to access them anywhere.
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button variant="outline" size="sm">
          Upload Files
        </Button>
      </Empty.Content>
    </Empty>
  );
});

/**
 * Use the `Empty.Media` component to display an avatar or icon in the empty state.
 */
export const EmptyAvatar = meta.story(() => {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Media variant="default">
          <Avatar.Root className="size-12">
            <Avatar.Image
              src="https://github.com/shadcn.png"
              className="grayscale"
            />
            <Avatar.Fallback>LR</Avatar.Fallback>
          </Avatar.Root>
        </Empty.Media>
        <Empty.Title>User Offline</Empty.Title>
        <Empty.Description>
          This user is currently offline. You can leave a message to notify them
          or try again later.
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button size="sm">Leave Message</Button>
      </Empty.Content>
    </Empty>
  );
});

/**
 * You can add an `InputGroup` component to the `Empty.Content` component.
 */
export const EmptyInputGroup = meta.story(() => {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Title>404 - Not Found</Empty.Title>
        <Empty.Description>
          The page you&apos;re looking for doesn&apos;t exist. Try searching for
          what you need below.
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <InputGroup className="sm:w-3/4">
          <InputGroupInput placeholder="Try searching for pages..." />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
        <Empty.Description>
          Need help? <a href="#">Contact support</a>
        </Empty.Description>
      </Empty.Content>
    </Empty>
  );
});
