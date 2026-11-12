import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {PlusIcon, Trash2Icon} from 'lucide-react';
import {ServiceFormField} from './service-form-field';

export const SERVICE_BUYER_QUESTIONS_MAX = 3;
export const SERVICE_BUYER_QUESTION_LENGTH = 160;

/**
 * Three optional, plain-text prompts. No arbitrary field schema or required
 * answer toggle; services without prompts retain the existing inquiry form.
 */
export function ServiceBuyerQuestionsField({
  questions,
  errors,
  onChange,
}: {
  questions: string[];
  errors: Record<string, string>;
  onChange: (questions: string[]) => void;
}) {
  const {trans} = useTrans();
  const atLimit = questions.length >= SERVICE_BUYER_QUESTIONS_MAX;

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm leading-5 text-muted-foreground">
        <Trans message="Buyers can answer these optional questions when asking for a quote. Your questions appear only on this service." />
      </p>
      {questions.map((question, index) => {
        const id = `buyer_questions.${index}`;
        return (
          <div key={index} className="flex min-w-0 items-end gap-2">
            <div className="min-w-0 flex-1">
              <ServiceFormField
                name={id}
                label={trans({message: 'Question :number', values: {number: index + 1}})}
                error={errors[id]}
                counter={{current: question.length, max: SERVICE_BUYER_QUESTION_LENGTH}}
              >
                <Input
                  id={id}
                  value={question}
                  maxLength={SERVICE_BUYER_QUESTION_LENGTH}
                  aria-invalid={!!errors[id]}
                  placeholder={trans({message: 'e.g. When do you need this completed?'})}
                  onChange={event => onChange(questions.map((value, itemIndex) =>
                    itemIndex === index ? event.target.value : value
                  ))}
                />
              </ServiceFormField>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              aria-label={trans({message: 'Remove question :number', values: {number: index + 1}})}
              onClick={() => onChange(questions.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-11"
        disabled={atLimit}
        onClick={() => onChange([...questions, ''])}
      >
        <PlusIcon data-icon="inline-start" />
        <Trans message="Add question" />
      </Button>
      {atLimit && (
        <p className="text-xs text-muted-foreground">
          <Trans message="Maximum 3 buyer questions reached." />
        </p>
      )}
    </div>
  );
}
