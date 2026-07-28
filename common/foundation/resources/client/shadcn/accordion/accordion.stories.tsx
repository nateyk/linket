import preview from '@storybook/preview';

import {Accordion} from '@shadcn/accordion/accordion';
import {Button} from '@shadcn/button/button';
import {Field, FieldSet} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Slider} from '@shadcn/forms/slider/slider';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Separator} from '@shadcn/separator';
import {ChevronRightIcon, GripHorizontalIcon, PlusIcon} from 'lucide-react';

const meta = preview.meta({
  title: 'Accordion',
  component: Accordion.Root,
  subcomponents: {
    Item: Accordion.Item,
    Trigger: Accordion.Trigger,
    Content: Accordion.Content,
  },
});

export const Basic = meta.story({
  render: function Basic() {
    return (
      <Accordion.Root defaultValue={['shipping']} className="max-w-lg">
        <Accordion.Item value="shipping">
          <Accordion.Trigger>What are your shipping options?</Accordion.Trigger>
          <Accordion.Content>
            We offer standard (5-7 days), express (2-3 days), and overnight
            shipping. Free shipping on international orders.
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="returns">
          <Accordion.Trigger>What is your return policy?</Accordion.Trigger>
          <Accordion.Content>
            Returns accepted within 30 days. Items must be unused and in
            original packaging. Refunds processed within 5-7 business days.
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="support">
          <Accordion.Trigger>
            How can I contact customer support?
          </Accordion.Trigger>
          <Accordion.Content>
            Reach us via email, live chat, or phone. We respond within 24 hours
            during business days.
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    );
  },
});

/**
 * Use `type="multiple"` to allow multiple items to be open at the same time.
 */
export const Multiple = meta.story({
  render: function Multiple() {
    const items = [
      {
        value: 'notifications',
        trigger: 'Notification Settings',
        content:
          'Manage how you receive notifications. You can enable email alerts for updates or push notifications for mobile devices.',
      },
      {
        value: 'privacy',
        trigger: 'Privacy & Security',
        content:
          'Control your privacy settings and security preferences. Enable two-factor authentication, manage connected devices, review active sessions, and configure data sharing preferences. You can also download your data or delete your account.',
      },
      {
        value: 'billing',
        trigger: 'Billing & Subscription',
        content:
          'View your current plan, payment history, and upcoming invoices. Update your payment method, change your subscription tier, or cancel your subscription.',
      },
    ];

    return (
      <Accordion.Root
        multiple
        className="max-w-lg"
        variant="bordered"
        defaultValue={['notifications']}
      >
        {items.map(item => (
          <Accordion.Item key={item.value} value={item.value}>
            <Accordion.Trigger>{item.trigger}</Accordion.Trigger>
            <Accordion.Content>{item.content}</Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    );
  },
});

/**
 * Example showing a complex form inside an accordion item.
 */
export const WithComplexForm = meta.story({
  render: function WithComplexForm() {
    const heroTypeItems = [
      {value: 'centered', label: 'Centered hero'},
      {value: 'split', label: 'Split with image'},
      {value: 'minimal', label: 'Minimal'},
    ];

    const content = (
      <Field.Group className="pt-1">
        <Field.Root>
          <Field.Label>Hero type</Field.Label>
          <Select.Root defaultValue="split" items={heroTypeItems}>
            <Select.Trigger className="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {heroTypeItems.map(item => (
                <Select.Item key={item.value} value={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field.Root>

        <Field.Root>
          <Field.Label>Badge</Field.Label>
          <Input defaultValue="Ship faster" />
        </Field.Root>

        <Field.Root>
          <Field.Label>Title</Field.Label>
          <Input defaultValue="Everything your team needs in one workspace." />
        </Field.Root>

        <Field.Root>
          <Field.Label>Description</Field.Label>
          <Textarea
            rows={4}
            defaultValue="Plan, collaborate, and deliver projects with a modern workflow built for speed."
          />
        </Field.Root>

        <Separator />

        <FieldSet.Root>
          <FieldSet.Legend>Buttons</FieldSet.Legend>
          <Field.Group className="gap-3">
            <Button
              variant="outline"
              color="default"
              type="button"
              className="justify-between"
            >
              Get started
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              color="default"
              type="button"
              className="justify-between"
            >
              Login
              <ChevronRightIcon />
            </Button>
            <Button variant="outline" size="sm" className="w-max">
              <PlusIcon />
              Add button
            </Button>
          </Field.Group>
        </FieldSet.Root>

        <Separator />

        <FieldSet.Root>
          <FieldSet.Legend>Background colors</FieldSet.Legend>
          <Field.Group>
            <Field.Root>
              <Field.Label>Color 1</Field.Label>
              <Input defaultValue="#1A2B5F" />
            </Field.Root>
            <Field.Root>
              <Field.Label>Color 2</Field.Label>
              <Input defaultValue="#4F46E5" />
            </Field.Root>
            <Field.Root>
              <Slider.Root
                defaultValue={[0.65]}
                min={0}
                max={1}
                step={0.05}
                format={{
                  style: 'percent',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }}
              >
                <Slider.Label>Opacity</Slider.Label>
                <Slider.Value />
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Indicator />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider.Control>
              </Slider.Root>
            </Field.Root>
          </Field.Group>
        </FieldSet.Root>

        <Separator />

        <Field.Group>
          <Field.Root>
            <Field.Label>
              <Switch defaultChecked />
              Always use dark mode colors
            </Field.Label>
          </Field.Root>
          <Field.Root>
            <Field.Label>
              <Switch />
              Show as panel
            </Field.Label>
          </Field.Root>
        </Field.Group>
      </Field.Group>
    );

    return (
      <Accordion.Root
        defaultValue={['shipping']}
        variant="separated"
        className="max-w-lg"
      >
        <Accordion.Item value="shipping">
          <Accordion.Trigger>
            <GripHorizontalIcon />
            Hero split with screenshot
          </Accordion.Trigger>
          <Accordion.Content>{content}</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="returns">
          <Accordion.Trigger>Features grid</Accordion.Trigger>
          <Accordion.Content>{content}</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="support">
          <Accordion.Trigger>Feature with screenshot</Accordion.Trigger>
          <Accordion.Content>{content}</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    );
  },
});

/**
 * Use the `disabled` prop on `Accordion.Item` to disable individual items.
 */
export const Disabled = meta.story({
  render: function Disabled() {
    return (
      <Accordion.Root className="w-full">
        <Accordion.Item value="item-1">
          <Accordion.Trigger>
            Can I access my account history?
          </Accordion.Trigger>
          <Accordion.Content>
            Yes, you can view your complete account history including all
            transactions, plan changes, and support tickets in the Account
            History section of your dashboard.
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-2" disabled>
          <Accordion.Trigger>Premium feature information</Accordion.Trigger>
          <Accordion.Content>
            This section contains information about premium features. Upgrade
            your plan to access this content.
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-3">
          <Accordion.Trigger>
            How do I update my email address?
          </Accordion.Trigger>
          <Accordion.Content>
            You can update your email address in your account settings.
            You&apos;ll receive a verification email at your new address to
            confirm the change.
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    );
  },
});
