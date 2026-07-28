import {Button} from '@common/shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Tabs} from '@shadcn/tabs/tabs';
import preview from '@storybook/preview';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  MaximizeIcon,
  MinimizeIcon,
} from 'lucide-react';
import {useState} from 'react';

const meta = preview.meta({
  title: 'Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
});

export const Basic = meta.story(() => {
  return (
    <Card className="mx-auto w-full max-w-sm">
      <Card.Content>
        <Collapsible className="rounded-md data-open:bg-muted">
          <CollapsibleTrigger
            render={
              <Button variant="ghost" color="default" className="w-full">
                Product details
                <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" />
              </Button>
            }
          />
          <CollapsibleContent className="flex flex-col items-start gap-2 p-2.5 pt-0 text-sm">
            <div>
              This panel can be expanded or collapsed to reveal additional
              content.
            </div>
            <Button size="xs">Learn More</Button>
          </CollapsibleContent>
        </Collapsible>
      </Card.Content>
    </Card>
  );
});

export const CollapsibleSettings = meta.story(() => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Card className="mx-auto w-full max-w-xs" size="sm">
      <Card.Header>
        <Card.Title>Radius</Card.Title>
        <Card.Description>
          Set the corner radius of the element.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="flex items-start gap-2"
        >
          <Field.Group className="grid w-full grid-cols-2 gap-2">
            <Field.Root>
              <Field.Label htmlFor="radius-x" className="sr-only">
                Radius X
              </Field.Label>
              <Input id="radius" placeholder="0" defaultValue={0} />
              <Field.Error />
            </Field.Root>
            <Field.Root>
              <Field.Label htmlFor="radius-y" className="sr-only">
                Radius Y
              </Field.Label>
              <Input id="radius" placeholder="0" defaultValue={0} />
              <Field.Error />
            </Field.Root>
            <CollapsibleContent className="col-span-full grid grid-cols-subgrid gap-2">
              <Field.Root>
                <Field.Label htmlFor="radius-x" className="sr-only">
                  Radius X
                </Field.Label>
                <Input id="radius" placeholder="0" defaultValue={0} />
                <Field.Error />
              </Field.Root>
              <Field.Root>
                <Field.Label htmlFor="radius-y" className="sr-only">
                  Radius Y
                </Field.Label>
                <Input id="radius" placeholder="0" defaultValue={0} />
                <Field.Error />
              </Field.Root>
            </CollapsibleContent>
          </Field.Group>
          <CollapsibleTrigger
            render={
              <Button variant="outline" color="default" size="icon">
                {isOpen ? <MinimizeIcon /> : <MaximizeIcon />}
              </Button>
            }
          />
        </Collapsible>
      </Card.Content>
    </Card>
  );
});

type FileTreeItem = {name: string} | {name: string; items: FileTreeItem[]};

export const CollapsibleFileTree = meta.story(() => {
  const fileTree: FileTreeItem[] = [
    {
      name: 'components',
      items: [
        {
          name: 'ui',
          items: [
            {name: 'button.tsx'},
            {name: 'card.tsx'},
            {name: 'dialog.tsx'},
            {name: 'input.tsx'},
            {name: 'select.tsx'},
            {name: 'table.tsx'},
          ],
        },
        {name: 'login-form.tsx'},
        {name: 'register-form.tsx'},
      ],
    },
    {
      name: 'lib',
      items: [{name: 'utils.ts'}, {name: 'cn.ts'}, {name: 'api.ts'}],
    },
    {
      name: 'hooks',
      items: [
        {name: 'use-media-query.ts'},
        {name: 'use-debounce.ts'},
        {name: 'use-local-storage.ts'},
      ],
    },
    {
      name: 'types',
      items: [{name: 'index.d.ts'}, {name: 'api.d.ts'}],
    },
    {
      name: 'public',
      items: [{name: 'favicon.ico'}, {name: 'logo.svg'}, {name: 'images'}],
    },
    {name: 'app.tsx'},
    {name: 'layout.tsx'},
    {name: 'globals.css'},
    {name: 'package.json'},
    {name: 'tsconfig.json'},
    {name: 'README.md'},
    {name: '.gitignore'},
  ];
  const renderItem = (fileItem: FileTreeItem) => {
    if ('items' in fileItem) {
      return (
        <Collapsible key={fileItem.name}>
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                color="default"
                size="sm"
                className="group w-full justify-start transition-none hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronRightIcon className="transition-transform group-data-[state=open]:rotate-90" />
                <FolderIcon />
                {fileItem.name}
              </Button>
            }
          />
          <CollapsibleContent className="style-lyra:ml-4 mt-1 ml-5">
            <div className="flex flex-col gap-1">
              {fileItem.items.map(child => renderItem(child))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }
    return (
      <Button
        key={fileItem.name}
        variant="link"
        size="sm"
        className="w-full justify-start gap-2 text-foreground"
      >
        <FileIcon />
        <span>{fileItem.name}</span>
      </Button>
    );
  };
  return (
    <Card className="mx-auto w-full max-w-md gap-2" size="sm">
      <Card.Header>
        <Tabs defaultValue="explorer">
          <Tabs.List className="w-full">
            <Tabs.Tab value="explorer">Explorer</Tabs.Tab>
            <Tabs.Tab value="settings">Outline</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Card.Header>
      <Card.Content>
        <div className="flex flex-col gap-1">
          {fileTree.map(item => renderItem(item))}
        </div>
      </Card.Content>
    </Card>
  );
});
