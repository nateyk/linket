import {Card} from '@shadcn/card/card';
import {Tabs} from '@shadcn/tabs/tabs';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';
import {AppWindowIcon, CodeIcon} from 'lucide-react';

const meta = preview.meta({
  title: 'Tabs',
  component: Tabs,
  subcomponents: {
    List: Tabs.List,
    Tab: Tabs.Tab,
    Panel: Tabs.Panel,
  },
});

export const Default = meta.story({
  render: () => (
    <Tabs.Root defaultValue="overview" className="w-[400px]">
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
        <Tabs.Tab value="reports">Reports</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">
        <Card>
          <Card.Header>
            <Card.Title>Overview</Card.Title>
            <Card.Description>
              View your key metrics and recent project activity. Track progress
              across all your active projects.
            </Card.Description>
          </Card.Header>
          <Card.Content className="text-sm text-muted-foreground">
            You have 12 active projects and 3 pending tasks.
          </Card.Content>
        </Card>
      </Tabs.Panel>
      <Tabs.Panel value="analytics">
        <Card>
          <Card.Header>
            <Card.Title>Analytics</Card.Title>
            <Card.Description>
              Track performance and user engagement metrics. Monitor trends and
              identify growth opportunities.
            </Card.Description>
          </Card.Header>
          <Card.Content className="text-sm text-muted-foreground">
            Page views are up 25% compared to last month.
          </Card.Content>
        </Card>
      </Tabs.Panel>
      <Tabs.Panel value="reports">
        <Card>
          <Card.Header>
            <Card.Title>Reports</Card.Title>
            <Card.Description>
              Generate and download your detailed reports. Export data in
              multiple formats for analysis.
            </Card.Description>
          </Card.Header>
          <Card.Content className="text-sm text-muted-foreground">
            You have 5 reports ready and available to export.
          </Card.Content>
        </Card>
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        <Card>
          <Card.Header>
            <Card.Title>Settings</Card.Title>
            <Card.Description>
              Manage your account preferences and options. Customize your
              experience to fit your needs.
            </Card.Description>
          </Card.Header>
          <Card.Content className="text-sm text-muted-foreground">
            Configure notifications, security, and themes.
          </Card.Content>
        </Card>
      </Tabs.Panel>
    </Tabs.Root>
  ),
});

export const Line = meta.story({
  render: () => (
    <Tabs.Root defaultValue="overview">
      <div className="border-b">
        <Tabs.List variant="line">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="reports">Reports</Tabs.Tab>
        </Tabs.List>
      </div>
    </Tabs.Root>
  ),
});
export const Vertical = meta.story({
  render: () => (
    <Tabs.Root defaultValue="account" orientation="vertical">
      <Tabs.List>
        <Tabs.Tab value="account">Account</Tabs.Tab>
        <Tabs.Tab value="password">Password</Tabs.Tab>
        <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
      </Tabs.List>
    </Tabs.Root>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Tabs.Root defaultValue="home">
        <Tabs.List>
          <Tabs.Tab value="home">
            <Trans message="Home" />
          </Tabs.Tab>
          <Tabs.Tab value="disabled" disabled>
            <Trans message="Disabled" />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.Root>
      <Tabs.Root defaultValue="home">
        <Tabs.List variant="line">
          <Tabs.Tab value="home">
            <Trans message="Home" />
          </Tabs.Tab>
          <Tabs.Tab value="disabled" disabled>
            <Trans message="Disabled" />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.Root>
    </div>
  ),
});

export const Icons = meta.story({
  render: () => (
    <Tabs.Root defaultValue="preview">
      <Tabs.List>
        <Tabs.Tab value="preview">
          <AppWindowIcon />
          Preview
        </Tabs.Tab>
        <Tabs.Tab value="code">
          <CodeIcon />
          Code
        </Tabs.Tab>
      </Tabs.List>
    </Tabs.Root>
  ),
});
