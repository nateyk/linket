import preview from '@storybook/preview';
import {useState} from 'react';
import {ServicePackagesField} from './service-packages-field';
import {emptyServiceForm, type ServiceFormPackage} from '../service-form-state';

const meta = preview.meta({
  title: 'Dashboard/Services/Service packages field',
  component: ServicePackagesField,
  decorators: [
    Story => (
      <div className="w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
});

export default meta;

/**
 * The field is controlled, so every story keeps its own rows in state —
 * adding, removing and preset-naming all behave as they do on the page.
 */
function PackagesFieldStory({
  packages,
  errors = {},
}: {
  packages: ServiceFormPackage[];
  errors?: Record<string, string>;
}) {
  const [rows, setRows] = useState(packages);

  return (
    <ServicePackagesField packages={rows} errors={errors} onChange={setRows} />
  );
}

export const Empty = meta.story({
  render: () => <PackagesFieldStory packages={emptyServiceForm().packages} />,
});

export const TwoPackages = meta.story({
  render: () => (
    <PackagesFieldStory
      packages={[
        {
          id: 12,
          name: 'Starter',
          description: 'Logo and palette for a new business.',
          price: '299',
          delivery_days: '6',
          revisions: '2',
          features: 'One logo concept\nPNG and vector files',
        },
        {
          id: 13,
          name: 'Premium',
          description: 'Adds a motion mark and a full type scale.',
          price: '',
          delivery_days: '14',
          revisions: '4',
          features: '',
        },
      ]}
    />
  ),
});

export const WithErrors = meta.story({
  render: () => (
    <PackagesFieldStory
      packages={[
        {
          name: '',
          description: '',
          price: '299',
          delivery_days: '',
          revisions: '',
          features: '',
        },
        {
          name: 'Premium',
          description: 'Adds a motion mark and a full type scale.',
          price: 'free',
          delivery_days: '14',
          revisions: '4',
          features: '',
        },
      ]}
      errors={{
        'packages.0.name': 'Give the package a name or remove the row.',
        'packages.1.price_cents':
          'Enter a number, or leave it empty for a quote-only package.',
      }}
    />
  ),
});
