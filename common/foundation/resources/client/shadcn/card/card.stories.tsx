import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Input} from '@shadcn/forms/input/input';
import {Label} from '@shadcn/forms/label';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';

const meta = preview.meta({
  title: 'Card',
  component: Card,
  subcomponents: {
    Header: Card.Header,
    Title: Card.Title,
    Description: Card.Description,
    Action: Card.Action,
    Content: Card.Content,
    Footer: Card.Footer,
  },
});

export const Default = meta.story({
  render: () => (
    <Card className="w-full max-w-sm">
      <Card.Header>
        <Card.Title>
          <Trans message="Project Overview" />
        </Card.Title>
        <Card.Description>
          <Trans message="Track progress and recent activity for your app." />
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Trans message="Your design system is ready. Start building your next component." />
      </Card.Content>
    </Card>
  ),
});

export const LoginForm = meta.story({
  render: () => (
    <Card className="w-full max-w-sm">
      <Card.Header>
        <Card.Title>
          <Trans message="Login to your account" />
        </Card.Title>
        <Card.Description>
          <Trans message="Enter your email below to login to your account" />
        </Card.Description>
        <Card.Action>
          <Button variant="link" className="h-auto p-0">
            <Trans message="Sign Up" />
          </Button>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <form>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">
                <Trans message="Email" />
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">
                  <Trans message="Password" />
                </Label>
                <Button
                  type="button"
                  variant="link"
                  className="ms-auto h-auto p-0 text-sm"
                >
                  <Trans message="Forgot your password?" />
                </Button>
              </div>
              <Input id="password" type="password" required />
            </div>
          </div>
        </form>
      </Card.Content>
      <Card.Footer className="flex-col gap-2">
        <Button type="submit" className="w-full">
          <Trans message="Login" />
        </Button>
        <Button variant="outline" className="w-full">
          <Trans message="Login with Google" />
        </Button>
      </Card.Footer>
    </Card>
  ),
});

export const WithImage = meta.story({
  render: () => (
    <Card className="relative w-full max-w-sm pt-0">
      <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
      <img
        src="https://avatar.vercel.sh/shadcn1"
        alt="Event cover"
        className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
      />
      <Card.Header>
        <Card.Action>
          <Badge color="secondary">
            <Trans message="Featured" />
          </Badge>
        </Card.Action>
        <Card.Title>
          <Trans message="Design systems meetup" />
        </Card.Title>
        <Card.Description>
          <Trans message="A practical talk on component APIs, accessibility, and shipping faster." />
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button className="w-full">
          <Trans message="View Event" />
        </Button>
      </Card.Footer>
    </Card>
  ),
});

export const Small = meta.story({
  render: () => (
    <Card size="sm" className="w-full max-w-sm">
      <Card.Header>
        <Card.Title>
          <Trans message="Storage" />
        </Card.Title>
        <Card.Description>
          <Trans message="You are using 12.4 GB of your workspace storage." />
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
      </Card.Content>
      <Card.Footer>
        <Button variant="outline" size="sm">
          <Trans message="Manage storage" />
        </Button>
      </Card.Footer>
    </Card>
  ),
});
