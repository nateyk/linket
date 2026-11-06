import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {PlusIcon, Trash2Icon} from 'lucide-react';
import {ServiceFormField} from './service-form-field';
import type {ServiceFormFaq} from '../service-form-state';

export const SERVICE_FAQS_MAX = 20;

/**
 * FAQ repeater. Questions are optional for the listing, so an unfinished row
 * is simply not published — the section keeps the creator's work visible
 * instead of hiding it behind a validation wall.
 */
export function ServiceFaqsField({
  faqs,
  errors,
  onChange,
}: {
  faqs: ServiceFormFaq[];
  errors: Record<string, string>;
  onChange: (faqs: ServiceFormFaq[]) => void;
}) {
  const {trans} = useTrans();
  const atLimit = faqs.length >= SERVICE_FAQS_MAX;

  const update = (index: number, patch: Partial<ServiceFormFaq>) => {
    onChange(
      faqs.map((item, itemIndex) =>
        itemIndex === index ? {...item, ...patch} : item,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {faqs.map((faq, index) => (
        <div
          key={faq.id ?? `new-${index}`}
          className={cn(
            'flex flex-col gap-4',
            index > 0 && 'mt-4 border-t border-border pt-5',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              <Trans message="Question :number" values={{number: index + 1}} />
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={trans({message: 'Remove FAQ'})}
              onClick={() =>
                onChange(faqs.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2Icon />
            </Button>
          </div>

          <ServiceFormField
            name={`faqs.${index}.question`}
            label={trans({message: 'Question'})}
            error={errors[`faqs.${index}.question`]}
          >
            <Input
              id={`faqs.${index}.question`}
              value={faq.question}
              maxLength={240}
              onChange={event => update(index, {question: event.target.value})}
              placeholder={trans({
                message: 'How long will my project take?',
              })}
              aria-invalid={!!errors[`faqs.${index}.question`]}
            />
          </ServiceFormField>

          <ServiceFormField
            name={`faqs.${index}.answer`}
            label={trans({message: 'Answer'})}
            error={errors[`faqs.${index}.answer`]}
          >
            <Textarea
              id={`faqs.${index}.answer`}
              rows={3}
              maxLength={3000}
              value={faq.answer}
              onChange={event => update(index, {answer: event.target.value})}
              aria-invalid={!!errors[`faqs.${index}.answer`]}
            />
          </ServiceFormField>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={atLimit}
        onClick={() => {
          if (faqs.length >= SERVICE_FAQS_MAX) return;
          onChange([...faqs, {question: '', answer: ''}]);
        }}
      >
        <PlusIcon data-icon="inline-start" />
        <Trans message="Add FAQ" />
      </Button>
      {atLimit && (
        <p className="text-xs leading-5 text-muted-foreground">
          <Trans
            message="Maximum :count FAQs reached."
            values={{count: SERVICE_FAQS_MAX}}
          />
        </p>
      )}
    </div>
  );
}