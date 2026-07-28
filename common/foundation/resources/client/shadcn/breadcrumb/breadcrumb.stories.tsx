import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';
import {MoreHorizontalIcon} from 'lucide-react';

const meta = preview.meta({
  title: 'Breadcrumb',
  component: Breadcrumb.Root,
  subcomponents: {
    Button: Breadcrumb.Button,
    Item: Breadcrumb.Item,
    Link: Breadcrumb.Link,
    Page: Breadcrumb.Page,
    Separator: Breadcrumb.Separator,
  },
});

export const Link = meta.story({
  render: () => (
    <Breadcrumb.Root>
      <Breadcrumb.Item>
        <Breadcrumb.Link to="/">
          <Trans message="Home" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Link to="/library">
          <Trans message="Library" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>
          <Trans message="Data" />
        </Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
  ),
});

export const DropdownExample = meta.story({
  render: () => (
    <Breadcrumb>
      <Breadcrumb.Item>
        <Breadcrumb.Link to="/">
          <Trans message="Home" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Dropdown.Root>
          <Dropdown.Trigger>
            <MoreHorizontalIcon />
          </Dropdown.Trigger>
          <Dropdown.Content align="start">
            <Dropdown.Item>
              <Trans message="Documentation" />
            </Dropdown.Item>
            <Dropdown.Item>
              <Trans message="Themes" />
            </Dropdown.Item>
            <Dropdown.Item>
              <Trans message="GitHub" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>
          <Trans message="Components" />
        </Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb>
  ),
});
