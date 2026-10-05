import {Accordion} from '@shadcn/accordion/accordion';
import {createContext, ReactNode, useContext, useId} from 'react';

type SectionLabelIds = {
  titleId: string;
  descriptionId: string;
};

/**
 * Ids the wrapper hands to the visual label (BuilderSectionHeader /
 * AppearanceSectionLabel) so this trigger can reference the title and
 * description from aria-labelledby / aria-describedby. A context keeps call
 * sites unchanged apart from the trigger tag: the label keeps owning the
 * copy, the wrapper owns the accessibility wiring.
 */
const SectionLabelIdsContext = createContext<SectionLabelIds | null>(null);

export function useSectionLabelIds(): SectionLabelIds | null {
  return useContext(SectionLabelIdsContext);
}

interface SectionAccordionTriggerProps {
  /**
   * Screen-reader phrase appended after the description to spell out a
   * compact badge ("6 of 6 products featured"). The visible badge itself
   * stays out of the accessible name.
   */
  descriptionPhrase?: ReactNode;
  children: ReactNode;
}

/**
 * Accordion trigger whose accessible name is the section title alone.
 * Description and badge phrase are exposed as the accessible description.
 * Only wraps labels built with BuilderSectionHeader / AppearanceSectionLabel,
 * which stamp the ids from useSectionLabelIds().
 */
export function SectionAccordionTrigger({
  descriptionPhrase,
  children,
}: SectionAccordionTriggerProps) {
  const id = useId();
  const ids: SectionLabelIds = {
    titleId: `${id}-title`,
    descriptionId: `${id}-description`,
  };
  const phraseId = `${id}-phrase`;
  const describedBy = descriptionPhrase
    ? `${ids.descriptionId} ${phraseId}`
    : ids.descriptionId;

  return (
    <Accordion.Trigger
      aria-labelledby={ids.titleId}
      aria-describedby={describedBy}
    >
      <SectionLabelIdsContext.Provider value={ids}>
        {children}
        {descriptionPhrase && (
          <span id={phraseId} className="sr-only">
            {descriptionPhrase}
          </span>
        )}
      </SectionLabelIdsContext.Provider>
    </Accordion.Trigger>
  );
}
