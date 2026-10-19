import preview from '@storybook/preview';
import {ServicePreview} from './service-preview';
import {emptyServiceForm} from '../service-form-state';

const meta = preview.meta({
  title: 'Dashboard/Services/Service preview',
  component: ServicePreview,
  decorators: [
    Story => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
});

export default meta;

export const Empty = meta.story({
  render: () => <ServicePreview state={emptyServiceForm()} />,
});

export const Draft = meta.story({
  render: () => (
    <ServicePreview
      state={{
        ...emptyServiceForm(),
        store_id: '1',
        title: 'Brand identity package',
        short_description: 'Logo, palette and type ready for launch.',
        description:
          'A full identity pass for a new business: one logo concept, a tuned palette, and a short type scale, delivered as print-ready and digital files.',
        category: 'Design',
        skills: 'Branding, Logo design, Illustration',
        cover_url: 'https://avatar.vercel.sh/shadcn1',
        packages: [
          {
            name: 'Starter',
            description: 'Logo and palette for a new business.',
            price: '4500',
            delivery_days: '10',
            revisions: '2',
            features: 'One logo concept\nPNG and vector files',
          },
        ],
        contact_channels: [
          {type: 'whatsapp', label: 'WhatsApp', value: '+251911000001'},
        ],
      }}
    />
  ),
});

export const PublishedWithPackages = meta.story({
  render: () => (
    <ServicePreview
      state={{
        ...emptyServiceForm(),
        store_id: '1',
        status: 'published',
        title: 'Landing page build',
        short_description: 'React and Tailwind page shipped in a week.',
        description:
          'One responsive landing page built with React and Tailwind CSS, wired to your own copy and imagery.',
        category: 'Development',
        skills: 'React, Tailwind CSS, Accessibility',
        cover_url: 'https://avatar.vercel.sh/shadcn2',
        packages: [
          {
            id: 12,
            name: 'Starter',
            description: 'One page, one breakpoint set.',
            price: '12000',
            delivery_days: '7',
            revisions: '2',
            features: 'One page\nMobile layout',
          },
          {
            id: 13,
            name: 'Premium',
            description: 'Adds an animation pass and a copy review.',
            price: '34000',
            delivery_days: '14',
            revisions: '4',
            features: 'Everything in Starter\nMotion pass',
          },
        ],
        contact_channels: [
          {type: 'email', label: 'Email', value: 'hi@example.com'},
          {type: 'telegram', label: 'Telegram', value: '@example'},
        ],
      }}
    />
  ),
});

/**
 * The preview clamps what it repeats — five skills, four packages, four
 * contact channels, a two-line summary. This state overshoots every one of
 * those limits so the story fails loudly if a clamp is ever removed.
 */
export const LongContent = meta.story({
  render: () => (
    <ServicePreview
      state={{
        ...emptyServiceForm(),
        store_id: '1',
        status: 'published',
        title:
          'Complete brand and web presence for a growing small business in Addis Ababa',
        short_description:
          'Everything a small business needs to look established online: identity, landing page, photography direction and a month of social templates delivered together.',
        description:
          'A long description that the visitor-facing preview never renders. It exists here so the story state matches what the form actually holds, and so a future change that starts rendering it shows up in review rather than in production.',
        category: 'Design and development',
        skills:
          'Branding, Logo design, Illustration, Web design, React, Copywriting',
        cover_url: 'https://avatar.vercel.sh/shadcn3',
        packages: [
          {
            id: 21,
            name: 'Essentials',
            description: 'Identity only.',
            price: '4500',
            delivery_days: '10',
            revisions: '2',
            features: 'One logo concept\nPalette',
          },
          {
            id: 22,
            name: 'Standard',
            description: 'Identity plus a one page site.',
            price: '18000',
            delivery_days: '14',
            revisions: '3',
            features: 'Everything in Essentials\nOne page build',
          },
          {
            id: 23,
            name: 'Premium',
            description: 'Identity, site and photography direction.',
            price: '42000',
            delivery_days: '21',
            revisions: '4',
            features: 'Everything in Standard\nPhotography direction',
          },
          {
            id: 24,
            name: 'Signature',
            description: 'Everything, with a launch day retainer.',
            price: '78000',
            delivery_days: '30',
            revisions: '6',
            features: 'Everything in Premium\nLaunch day support',
          },
          {
            id: 25,
            name: 'Quote only',
            description: 'Blank price, shown as a request for a quote.',
            price: '',
            delivery_days: '',
            revisions: '',
            features: '',
          },
        ],
        contact_channels: [
          {type: 'whatsapp', label: 'WhatsApp', value: '+251911000001'},
          {type: 'telegram', label: 'Telegram', value: '@example'},
          {type: 'email', label: 'Email', value: 'hi@example.com'},
          {type: 'phone', label: 'Phone', value: '+251911000002'},
          {type: 'link', label: 'Portfolio', value: 'https://example.com'},
        ],
      }}
    />
  ),
});
