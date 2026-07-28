import {AdminSettings} from '@common/admin/settings/admin-settings';
import {CtaSectionSettings} from '@common/admin/settings/landing-page-settings/cta-section-settings';
import {FaqSectionSettings} from '@common/admin/settings/landing-page-settings/faq-section-settings';
import {FeatureSectionSettings} from '@common/admin/settings/landing-page-settings/feature-section-settings';
import {FeaturesGridSettings} from '@common/admin/settings/landing-page-settings/features-grid-settings';
import {FooterSectionSettings} from '@common/admin/settings/landing-page-settings/footer-section-settings';
import {HeroSectionSettings} from '@common/admin/settings/landing-page-settings/hero-section-settings';
import {LandingPageSettingsContext} from '@common/admin/settings/landing-page-settings/landing-page-settings-context';
import {PricingSectionSettings} from '@common/admin/settings/landing-page-settings/pricing-section-settings';
import {SettingsWithPreview} from '@common/admin/settings/layout/settings-with-preview';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {SectionConfig} from '@common/ui/landing-page/landing-page-config';
import {sectionLabels} from '@common/ui/landing-page/section-labels';
import {Accordion} from '@shadcn/accordion/accordion';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Trans} from '@ui/i18n/trans';
import {useSortable} from '@ui/interactions/dnd/sortable/use-sortable';
import {GripHorizontal, PlusIcon} from 'lucide-react';
import {use, useRef, useState} from 'react';
import {useFieldArray, useForm} from 'react-hook-form';

export function Component() {
  const {data} = useAdminSettings();
  const s = data.client;
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        landingPage: s.landingPage,
      },
    },
  });

  return (
    <SettingsWithPreview
      title={<Trans message="Landing page" />}
      defaultRoute="/?forceHomepage=landing"
    >
      <SettingsWithPreview.Content>
        <SettingsWithPreview.Form form={form}>
          <Sections />
        </SettingsWithPreview.Form>
      </SettingsWithPreview.Content>
      <SettingsWithPreview.Preview />
    </SettingsWithPreview>
  );
}

function Sections() {
  const {fields, remove, append, move} = useFieldArray<
    AdminSettings,
    'client.landingPage.sections'
  >({
    name: 'client.landingPage.sections',
  });
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const ctx = use(LandingPageSettingsContext);
  return (
    <div>
      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button
              variant="outline"
              color="primary"
              size="sm"
              className="mb-5"
            />
          }
        >
          <PlusIcon />
          <Trans message="Add section" />
        </Dropdown.Trigger>
        <Dropdown.Content className="w-60">
          {Object.entries(sectionLabels).map(([name, label]) => (
            <Dropdown.Item
              key={name}
              onClick={() => append({name} as SectionConfig)}
            >
              {label}
            </Dropdown.Item>
          ))}
          {ctx?.customSections
            ? Object.entries(ctx.customSections).map(([name, {label}]) => (
                <Dropdown.Item
                  key={name}
                  onClick={() => append({name} as SectionConfig)}
                >
                  {label}
                </Dropdown.Item>
              ))
            : null}
        </Dropdown.Content>
      </Dropdown.Root>
      <Accordion
        variant="separated"
        value={expandedSections}
        onValueChange={setExpandedSections}
      >
        {fields.map((field, index) => (
          <SectionWrapper
            key={field.id}
            id={field.id}
            ids={fields.map(f => f.id)}
            name={field.name}
            index={index}
            onSortStart={() => setExpandedSections([])}
            onSortEnd={(oldIndex, newIndex) => {
              move(oldIndex, newIndex);
            }}
            onRemove={() => {
              setExpandedSections([]);
              remove(index);
            }}
          />
        ))}
      </Accordion>
    </div>
  );
}

type SectionWrapperProps = {
  id: string;
  ids: string[];
  name: SectionConfig['name'];
  index: number;
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  onSortStart: () => void;
  onRemove: () => void;
};
function SectionWrapper({
  id,
  ids,
  name,
  index,
  onSortEnd,
  onSortStart,
  onRemove,
}: SectionWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ctx = use(LandingPageSettingsContext);
  const {sortableProps, dragHandleRef} = useSortable({
    item: id,
    items: ids,
    type: 'sectionsSortable',
    ref,
    onSortEnd,
    onSortStart,
    strategy: 'liveSort',
  });

  const label = ctx?.customSections?.[name]?.label ?? sectionLabels[name];

  return (
    <div ref={ref} {...sortableProps}>
      <Accordion.Item value={id}>
        <div className="flex items-center">
          <button
            type="button"
            ref={dragHandleRef}
            className="shrink-0 pr-1 pl-3 text-muted-foreground hover:cursor-move"
          >
            <GripHorizontal className="size-4" />
          </button>
          <Accordion.Trigger>{label}</Accordion.Trigger>
        </div>
        <Accordion.Content>
          <SectionConfigPanel name={name} index={index} />
          <div className="mt-4 -ml-2 border-t pt-4">
            <Button
              variant="ghost"
              color="danger"
              size="sm"
              onClick={() => onRemove()}
            >
              <Trans message="Remove section" />
            </Button>
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </div>
  );
}

type SectionConfigProps = {
  name: SectionConfig['name'];
  index: number;
};
function SectionConfigPanel({name, index}: SectionConfigProps) {
  const ctx = use(LandingPageSettingsContext);
  switch (name) {
    case 'hero-split-with-screenshot':
    case 'hero-with-background-image':
    case 'hero-simple-centered':
      return <HeroSectionSettings index={index} />;
    case 'feature-with-screenshot':
      return <FeatureSectionSettings index={index} />;
    case 'features-grid':
      return <FeaturesGridSettings index={index} />;
    case 'faq':
      return <FaqSectionSettings index={index} />;
    case 'cta-simple-centered':
      return <CtaSectionSettings index={index} />;
    case 'pricing':
      return <PricingSectionSettings index={index} />;
    case 'footer':
      return <FooterSectionSettings index={index} />;
    default: {
      const Renderer = ctx?.customSections?.[name]?.component;
      if (!Renderer) {
        return null;
      }
      return <Renderer index={index} />;
    }
  }
}
