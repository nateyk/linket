import {Accordion} from '@shadcn/accordion/accordion';
import {Input} from '@shadcn/forms/input/input';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  CircleHelpIcon,
  ImagesIcon,
  LayersIcon,
  MessageSquareQuoteIcon,
  PackageIcon,
} from 'lucide-react';
import {ServiceFormField} from './service-form-field';
import {ServiceFormSection} from './service-form-section';
import type {ComponentProps} from 'react';

const meta = preview.meta({
  title: 'Dashboard/Services/Service form section',
  component: ServiceFormSection,
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
 * `ServiceFormSection` is an `Accordion.Item`, so every story has to supply
 * the `Accordion.Root` it belongs to — open by default, otherwise the story
 * shows a collapsed header and nothing else.
 */
function SectionStory(props: ComponentProps<typeof ServiceFormSection>) {
  return (
    <Accordion.Root variant="bordered" defaultValue={[props.id]}>
      <ServiceFormSection {...props} />
    </Accordion.Root>
  );
}

function SectionBody() {
  const {trans} = useTrans();

  return (
    <div className="flex flex-col gap-4">
      <ServiceFormField
        name="title"
        label={trans({message: 'Service title'})}
        description={trans({message: 'What visitors see first.'})}
        required
      >
        <Input id="title" defaultValue="Brand identity package" />
      </ServiceFormField>
      <ServiceFormField
        name="short_description"
        label={trans({message: 'One line summary'})}
      >
        <Input
          id="short_description"
          defaultValue="Logo, palette and type ready for launch."
        />
      </ServiceFormField>
      <p className="text-sm text-muted-foreground">
        <Trans message="Only this section's fields are saved when it is complete." />
      </p>
    </div>
  );
}

export const Complete = meta.story({
  render: function Complete() {
    const {trans} = useTrans();

    return (
      <SectionStory
        id="basics"
        icon={LayersIcon}
        title={trans({message: 'Basics'})}
        description={trans({
          message: 'Name the offer and describe it in one clear line.',
        })}
        isComplete
      >
        <SectionBody />
      </SectionStory>
    );
  },
});

export const Incomplete = meta.story({
  render: function Incomplete() {
    const {trans} = useTrans();

    return (
      <SectionStory
        id="media"
        icon={ImagesIcon}
        title={trans({message: 'Media and links'})}
        description={trans({
          message: 'A cover image carries the listing; the rest is optional.',
        })}
      >
        <SectionBody />
      </SectionStory>
    );
  },
});

export const WithCount = meta.story({
  render: function WithCount() {
    const {trans} = useTrans();

    return (
      <SectionStory
        id="packages"
        icon={PackageIcon}
        title={trans({message: 'Packages'})}
        description={trans({
          message: 'What visitors can ask you for, and for how much.',
        })}
        isComplete
        count={3}
      >
        <SectionBody />
      </SectionStory>
    );
  },
});

export const Optional = meta.story({
  render: function Optional() {
    const {trans} = useTrans();

    return (
      <SectionStory
        id="faq"
        icon={CircleHelpIcon}
        title={trans({message: 'FAQ'})}
        description={trans({
          message: 'Answer the questions every visitor asks anyway.',
        })}
        optional
      >
        <SectionBody />
      </SectionStory>
    );
  },
});

export const WithError = meta.story({
  render: function WithError() {
    const {trans} = useTrans();

    return (
      <SectionStory
        id="contact"
        icon={MessageSquareQuoteIcon}
        title={trans({message: 'Contact buttons'})}
        description={trans({
          message: 'Let visitors start a conversation without a form.',
        })}
        hasError
      >
        <SectionBody />
      </SectionStory>
    );
  },
});
