import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Checkbox, CheckboxGroup} from '@shadcn/forms/checkbox/checkbox';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Field, FieldSet} from '@shadcn/forms/field';
import {Form} from '@shadcn/forms/form/form';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Select} from '@shadcn/forms/select/select';
import {Slider} from '@shadcn/forms/slider/slider';
import {Switch} from '@shadcn/forms/switch/switch';
import preview from '@storybook/preview';
import {useActionState} from 'react';
import {useForm} from 'react-hook-form';

const meta = preview.meta({
  title: 'Form',
  component: Form,
  subcomponents: {
    HookForm: HookForm.Root,
    HookFormField: HookForm.Field,
  },
});

export const NativeFormExample = meta.story({
  render: function Render() {
    const [state, formAction, loading] = useActionState(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          serverErrors: {
            title: 'Server error for title',
            description: 'Server error for description',
          },
        };
      },
      {
        serverErrors: {
          title: '',
          description: '',
        },
      },
    );
    return (
      <Card className="w-full sm:max-w-md">
        <Card.Header>
          <Card.Title>Bug Report</Card.Title>
          <Card.Description>
            Help us improve by reporting bugs you encounter.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form
            action={formAction}
            errors={state.serverErrors}
            id="form-native-example"
          >
            <Field.Group>
              <Field.Root name="title">
                <Field.Label>Bug Title</Field.Label>
                <Input
                  placeholder="Login button not working on mobile"
                  required
                  minLength={5}
                  maxLength={32}
                />
                <Field.Error />
              </Field.Root>
              <Field.Root name="description">
                <Field.Label>Description</Field.Label>
                <InputGroup>
                  <InputGroupTextarea
                    placeholder="I'm having an issue with the login button on mobile."
                    rows={6}
                    className="min-h-24 resize-none"
                    required
                    minLength={10}
                    maxLength={100}
                  />
                  <InputGroupAddon align="block-end">
                    <InputGroupText className="tabular-nums">
                      100 characters
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <Field.Description>
                  Include steps to reproduce, expected behavior, and what
                  actually happened.
                </Field.Description>
                <Field.Error />
              </Field.Root>
            </Field.Group>
          </Form>
        </Card.Content>
        <Card.Footer>
          <Button type="submit" form="form-native-example" disabled={loading}>
            Submit
          </Button>
        </Card.Footer>
      </Card>
    );
  },
});

export const HookFormExample = meta.story({
  render: function Render() {
    const form = useForm({
      defaultValues: {
        serverName: '',
        region: 'us-east-1',
        serverType: 'web',
        numOfInstances: 1,
        scalingThreshold: [0.3, 0.8],
        storageType: 'ssd',
        restartOnFailure: false,
        allowedNetworkProtocols: [],
      },
    });

    return (
      <Card className="w-full sm:max-w-md">
        <Card.Header>
          <Card.Title>Create a new server</Card.Title>
          <Card.Description>
            Create a new server to host your application.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <HookForm.Root
            id="hook-form"
            form={form}
            onSubmit={values => {
              console.log(values);
            }}
          >
            <Field.Group>
              <HookForm.Field name="serverName">
                <Field.Label>Server name</Field.Label>
                <Input
                  placeholder="e.g. api-server-01"
                  required
                  minLength={3}
                  pattern=".*[A-Za-z].*"
                />
                <Field.Description>
                  Must be 3 or more characters long
                </Field.Description>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="region">
                <Field.Label>Region</Field.Label>
                <Combobox.Root items={REGIONS}>
                  <Combobox.Input placeholder="Select a region" />
                  <Combobox.Content>
                    <Combobox.Empty>No items found.</Combobox.Empty>
                    <Combobox.List>
                      {item => (
                        <Combobox.Item key={item.value} value={item.value}>
                          {item.label}
                        </Combobox.Item>
                      )}
                    </Combobox.List>
                  </Combobox.Content>
                </Combobox.Root>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="serverType">
                <Field.Label>Server type</Field.Label>
                <Select.Root items={SERVER_TYPES}>
                  <Select.Trigger className="w-52">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {SERVER_TYPES.map(item => (
                      <Select.Item key={item.value} value={item.value}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="numOfInstances">
                <Field.Label>Number of instances</Field.Label>
                <NumberField min={1} max={64}>
                  <NumberFieldDecrement />
                  <NumberFieldInput />
                  <NumberFieldIncrement />
                </NumberField>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="scalingThreshold">
                <Slider.Root
                  min={0}
                  max={1}
                  step={0.01}
                  format={{
                    style: 'percent',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }}
                >
                  <Slider.Label>Scaling threshold</Slider.Label>
                  <Slider.Value />
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Indicator />
                      <Slider.Thumb index={0} aria-label="Minimum threshold" />
                      <Slider.Thumb index={1} aria-label="Maximum threshold" />
                    </Slider.Track>
                  </Slider.Control>
                </Slider.Root>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="storageType">
                <FieldSet.Root>
                  <FieldSet.Legend>Storage type</FieldSet.Legend>
                  <RadioGroup orientation="horizontal">
                    <Field.Label>
                      <RadioGroupItem value="ssd" />
                      SSD
                    </Field.Label>
                    <Field.Label>
                      <RadioGroupItem value="hdd" />
                      HDD
                    </Field.Label>
                  </RadioGroup>
                </FieldSet.Root>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="restartOnFailure">
                <Field.Label>
                  Restart on failure
                  <Switch />
                </Field.Label>
                <Field.Error />
              </HookForm.Field>

              <FieldSet.Root>
                <FieldSet.Legend>Allowed network protocols</FieldSet.Legend>
                <HookForm.Field name="allowedNetworkProtocols">
                  <CheckboxGroup orientation="horizontal">
                    {['http', 'https', 'ssh'].map(val => (
                      <Field.Item key={val}>
                        <Field.Label className="uppercase">
                          <Checkbox value={val} />

                          {val}
                        </Field.Label>
                      </Field.Item>
                    ))}
                  </CheckboxGroup>
                  <Field.Error />
                </HookForm.Field>
              </FieldSet.Root>
            </Field.Group>
          </HookForm.Root>
        </Card.Content>
        <Card.Footer className="gap-2">
          <Button
            type="button"
            variant="outline"
            color="default"
            onClick={() => form.reset()}
          >
            Reset
          </Button>
          <Button type="submit" form="hook-form">
            Launch server
          </Button>
        </Card.Footer>
      </Card>
    );
  },
});

const REGIONS = [
  {value: 'us-east-1', label: 'US East (N. Virginia)'},
  {value: 'us-west-1', label: 'US West (N. California)'},
  {value: 'us-west-2', label: 'US West (Oregon)'},
  {value: 'us-west-3', label: 'US West (N. Texas)'},
  {value: 'eu-central-1', label: 'EU Central (Frankfurt)'},
  {value: 'eu-west-1', label: 'EU West (Ireland)'},
  {value: 'eu-west-2', label: 'EU West (London)'},
  {value: 'eu-west-3', label: 'EU West (Paris)'},
  {value: 'eu-west-4', label: 'EU West (Stockholm)'},
  {value: 'eu-west-5', label: 'EU West (Milan)'},
  {value: 'eu-west-6', label: 'EU West (Madrid)'},
  {value: 'eu-west-7', label: 'EU West (Berlin)'},
  {value: 'eu-west-8', label: 'EU West (Amsterdam)'},
];

const SERVER_TYPES = [
  {value: 'web', label: 'Web server'},
  {value: 'database', label: 'Database server'},
  {value: 'storage', label: 'Storage server'},
  {value: 'cache', label: 'Cache server'},
  {value: 'load-balancer', label: 'Load balancer'},
];
