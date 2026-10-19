import {SectionAccordionTrigger} from '@app/dashboard/stores/store-editor/section-accordion-trigger';
import {BuilderSectionHeader} from '@app/dashboard/stores/store-editor/builder-section-header';
import {Accordion} from '@shadcn/accordion/accordion';
import {Badge} from '@shadcn/badge/badge';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

export type ServiceFormSectionId =
  | 'basics'
  | 'media'
  | 'packages'
  | 'faq'
  | 'contact';

interface ServiceFormSectionProps {
  id: ServiceFormSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Absent on optional sections: their header icon stays muted. */
  isComplete?: boolean;
  /** Repeater length shown as a count chip in the header. */
  count?: number;
  /** Optional sections say so instead of pretending to be required. */
  optional?: boolean;
  hasError?: boolean;
  children: ReactNode;
}

/**
 * One bordered accordion section of the service form. The trigger's
 * accessible name is the section title alone; the description and the
 * optional/count phrase ride along as its accessible description.
 */
export function ServiceFormSection({
  id,
  title,
  description,
  icon: Icon,
  isComplete = false,
  count,
  optional = false,
  hasError = false,
  children,
}: ServiceFormSectionProps) {
  const {trans} = useTrans();

  return (
    <Accordion.Item
      value={id}
      className={cn(hasError && 'border-destructive/40')}
    >
      <SectionAccordionTrigger
        descriptionPhrase={optional ? trans({message: 'Optional section'}) : undefined}
      >
        <BuilderSectionHeader
          icon={Icon}
          isComplete={isComplete}
          title={title}
          description={description}
          trailing={
            <span className="flex items-center gap-1.5">
              {optional && <Badge variant="ghost">{trans({message: 'Optional'})}</Badge>}
              {count !== undefined && count > 0 && (
                <Badge variant="secondary" className="min-w-[18px] px-1.5">
                  {count}
                </Badge>
              )}
            </span>
          }
        />
      </SectionAccordionTrigger>
      <Accordion.Content className="border-t pt-4">
        <div className="max-w-2xl">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}