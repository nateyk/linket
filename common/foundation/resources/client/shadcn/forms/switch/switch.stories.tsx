import {CheckboxGroup} from '@shadcn/forms/checkbox/checkbox';
import {Field, FieldSet} from '@shadcn/forms/field';
import {Switch} from '@shadcn/forms/switch/switch';
import preview from '@storybook/preview';

const meta = preview.meta({
  title: 'Switch',
  component: Switch,
  tags: ['autodocs'],
});

export const Vertical = meta.story({
  render: () => (
    <Field.Group className="mx-auto w-72">
      <Field.Root>
        <Field.Label>
          <Switch defaultChecked />
          Accept terms and conditions
        </Field.Label>
        <Field.Description>
          By clicking this checkbox, you agree to the terms and conditions.
        </Field.Description>
      </Field.Root>
    </Field.Group>
  ),
});

export const Invalid = meta.story({
  render: () => (
    <Field.Group className="mx-auto w-72">
      <Field.Root orientation="horizontal" data-invalid>
        <Field.Label>
          <Switch aria-invalid defaultChecked />
          Accept terms and conditions
        </Field.Label>
      </Field.Root>
    </Field.Group>
  ),
});

export const Disabled = meta.story({
  render: () => (
    <Field.Group className="mx-auto w-72">
      <Field.Root orientation="horizontal" data-disabled>
        <Field.Label>
          <Switch disabled defaultChecked />
          Accept terms and conditions
        </Field.Label>
      </Field.Root>
    </Field.Group>
  ),
});

export const SwitchCards = meta.story(() => {
  return (
    <div className="w-full max-w-lg">
      <FieldSet.Root>
        <FieldSet.Legend variant="label">Compute Environment</FieldSet.Legend>
        <FieldSet.Description>
          Select the compute environment for your cluster.
        </FieldSet.Description>
        <Field.Root>
          <CheckboxGroup defaultValue={['kubernetes']}>
            <Field.Item>
              <Field.Label variant="card">
                <Field.Title>Kubernetes</Field.Title>
                <Switch value="kubernetes" />
                <Field.Description>
                  Run GPU workloads on a K8s cluster.
                </Field.Description>
              </Field.Label>
            </Field.Item>
            <Field.Item>
              <Field.Label variant="card">
                <Field.Title>Virtual Machine</Field.Title>
                <Switch value="vm" />
                <Field.Description>
                  Access a cluster to run GPU workloads.
                </Field.Description>
              </Field.Label>
            </Field.Item>
            <Field.Item>
              <Field.Label variant="card">
                <Field.Title>Local</Field.Title>
                <Switch value="local" />
                <Field.Description>
                  Run GPU workloads on your local machine.
                </Field.Description>
              </Field.Label>
            </Field.Item>
          </CheckboxGroup>
        </Field.Root>
      </FieldSet.Root>
    </div>
  );
});
