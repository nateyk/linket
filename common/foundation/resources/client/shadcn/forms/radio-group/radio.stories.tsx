import {Field, FieldSet} from '@shadcn/forms/field';
import {Label} from '@shadcn/forms/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import preview from '@storybook/preview';

const meta = preview.meta({
  title: 'RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
});

export const Vertical = meta.story({
  render: () => (
    <div className="w-full max-w-md">
      <RadioGroup>
        <Label>
          <RadioGroupItem value="default" />
          Default
        </Label>
        <Label>
          <RadioGroupItem value="comfortable" />
          Comfortable
        </Label>
        <Label>
          <RadioGroupItem value="compact" />
          Compact
        </Label>
      </RadioGroup>
    </div>
  ),
});

export const Horizontal = meta.story({
  render: () => (
    <div className="w-full max-w-md">
      <RadioGroup orientation="horizontal">
        <Label>
          <RadioGroupItem value="default" />
          Default
        </Label>
        <Label>
          <RadioGroupItem value="comfortable" disabled />
          Comfortable
        </Label>
        <Label>
          <RadioGroupItem value="compact" />
          Compact
        </Label>
      </RadioGroup>
    </div>
  ),
});

export const RadioWithDescription = meta.story(() => {
  return (
    <div className="w-full max-w-xs">
      <Field.Root>
        <RadioGroup defaultValue="kubernetes">
          <Field.Item>
            <Field.Label>
              <RadioGroupItem value="kubernetes" />
              <Field.Title>Kubernetes</Field.Title>
            </Field.Label>
            <Field.Description>
              Run GPU workloads on a K8s cluster.
            </Field.Description>
          </Field.Item>
          <Field.Item>
            <Field.Label>
              <RadioGroupItem value="vm" />
              <Field.Title>Virtual Machine</Field.Title>
            </Field.Label>
            <Field.Description>
              Access a cluster to run GPU workloads.
            </Field.Description>
          </Field.Item>
          <Field.Item>
            <Field.Label>
              <RadioGroupItem value="local" />
              <Field.Title>Local</Field.Title>
            </Field.Label>
            <Field.Description>
              Run GPU workloads on your local machine.
            </Field.Description>
          </Field.Item>
        </RadioGroup>
      </Field.Root>
    </div>
  );
});

export const RadioCards = meta.story(() => {
  return (
    <div className="w-full max-w-xs">
      <FieldSet.Root>
        <FieldSet.Legend variant="label">Compute Environment</FieldSet.Legend>
        <FieldSet.Description>
          Select the compute environment for your cluster.
        </FieldSet.Description>
        <Field.Root>
          <RadioGroup defaultValue="kubernetes">
            <Field.Item>
              <Field.Label variant="card">
                <Field.Title>Kubernetes</Field.Title>
                <RadioGroupItem value="kubernetes" />
                <Field.Description>
                  Run GPU workloads on a K8s cluster.
                </Field.Description>
              </Field.Label>
            </Field.Item>
            <Field.Item>
              <Field.Label variant="card">
                <Field.Title>Virtual Machine</Field.Title>
                <RadioGroupItem value="vm" />
                <Field.Description>
                  Access a cluster to run GPU workloads.
                </Field.Description>
              </Field.Label>
            </Field.Item>
            <Field.Item>
              <Field.Label variant="card">
                <Field.Title>Local</Field.Title>
                <RadioGroupItem value="local" />
                <Field.Description>
                  Run GPU workloads on your local machine.
                </Field.Description>
              </Field.Label>
            </Field.Item>
          </RadioGroup>
        </Field.Root>
      </FieldSet.Root>
    </div>
  );
});

export const RadioGroupInvalid = meta.story(() => {
  return (
    <FieldSet.Root className="w-full max-w-xs">
      <FieldSet.Legend variant="label">
        Notification Preferences
      </FieldSet.Legend>
      <FieldSet.Description>
        Choose how you want to receive notifications.
      </FieldSet.Description>
      <RadioGroup defaultValue="email">
        <Field.Root orientation="horizontal" data-invalid>
          <RadioGroupItem value="email" id="invalid-email" aria-invalid />
          <Field.Label htmlFor="invalid-email" className="font-normal">
            Email only
          </Field.Label>
        </Field.Root>
        <Field.Root orientation="horizontal" data-invalid>
          <RadioGroupItem value="sms" id="invalid-sms" aria-invalid />
          <Field.Label htmlFor="invalid-sms" className="font-normal">
            SMS only
          </Field.Label>
        </Field.Root>
        <Field.Root orientation="horizontal" data-invalid>
          <RadioGroupItem value="both" id="invalid-both" aria-invalid />
          <Field.Label htmlFor="invalid-both" className="font-normal">
            Both Email & SMS
          </Field.Label>
        </Field.Root>
      </RadioGroup>
    </FieldSet.Root>
  );
});
