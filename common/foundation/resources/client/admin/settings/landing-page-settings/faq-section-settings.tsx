import {LandingPageFaqConfig} from '@common/ui/landing-page/faq/landing-page-faq';
import {Button} from '@shadcn/button/button';
import {Drawer} from '@shadcn/drawer/drawer';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {
  useSortable,
  UseSortableProps,
} from '@ui/interactions/dnd/sortable/use-sortable';
import {ChevronRight, GripVertical, PlusIcon} from 'lucide-react';
import {useRef, useState} from 'react';
import {useFieldArray, UseFieldArrayReturn, useWatch} from 'react-hook-form';

const accordionVariantOptions = [
  {value: 'default', label: <Trans message="Default" />},
  {value: 'bordered', label: <Trans message="Bordered" />},
  {value: 'separated', label: <Trans message="Separated" />},
] as const;

type Props = {
  index: number;
};
export function FaqSectionSettings({index}: Props) {
  const prefix =
    `client.landingPage.sections.${index}` as `client.landingPage.sections.${number}`;
  return (
    <Field.Group>
      <HookForm.Field name={`${prefix}.badge`}>
        <Field.Label>
          <Trans message="Badge" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.title`}>
        <Field.Label>
          <Trans message="Title" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.description`}>
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Textarea rows={4} />
        <Field.Error />
      </HookForm.Field>

      <Field.Separator />

      <FaqListEditor prefix={prefix} />

      <Field.Separator />

      <HookForm.Field name={`${prefix}.variant`}>
        <Field.Label>
          <Trans message="Variant" />
        </Field.Label>
        <Select.Root items={accordionVariantOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {accordionVariantOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.mutedBg`}>
        <Field.Label>
          <Switch />
          <Trans message="Muted background" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

type FaqListEditorProps = {
  prefix: string;
};
function FaqListEditor({prefix}: FaqListEditorProps) {
  const {fields, remove, append, move} = useFieldArray({
    name: `${prefix}.questions`,
  }) as unknown as UseFieldArrayReturn<LandingPageFaqConfig, 'questions'>;
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(
    null,
  );
  return (
    <div className="flex flex-col gap-2">
      <Field.Title>
        <Trans message="FAQ list" />
      </Field.Title>
      {fields.map((question, index) => (
        <FaqListItem
          key={question.id}
          question={question}
          questions={fields}
          onSortEnd={(oldIndex, newIndex) => move(oldIndex, newIndex)}
          index={index}
          prefix={prefix}
          isOpen={activeQuestionIndex === index}
          onOpenChange={open => setActiveQuestionIndex(open ? index : null)}
          onDelete={() => {
            remove(index);
            setActiveQuestionIndex(null);
          }}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        color="primary"
        size="sm"
        className="w-max"
        onClick={() => {
          append({
            question: `Question ${fields.length + 1}`,
            answer: `Answer ${fields.length + 1}`,
          });
          setActiveQuestionIndex(fields.length);
        }}
      >
        <PlusIcon />
        <Trans message="Add new question" />
      </Button>
    </div>
  );
}

type FaqListItemProps = {
  question: {id: string};
  questions: {id: string}[];
  onSortEnd: UseSortableProps['onSortEnd'];
  index: number;
  prefix: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
};
function FaqListItem({
  question,
  questions,
  onSortEnd,
  index,
  prefix,
  isOpen,
  onOpenChange,
  onDelete,
}: FaqListItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const {sortableProps} = useSortable({
    item: question.id,
    items: questions.map(f => f.id),
    ref,
    type: 'faqList',
    onSortEnd,
    strategy: 'liveSort',
  });
  const formPathPrefix = `${prefix}.questions.${index}`;

  return (
    <Drawer.Root position="right" open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Trigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            ref={ref}
            {...sortableProps}
          />
        }
      >
        <GripVertical className="size-4 text-muted-foreground" />
        <QuestionName index={index} formPathPrefix={`${prefix}.questions`} />
        <ChevronRight
          className="ml-auto text-muted-foreground"
          data-icon="inline-end"
        />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Content>
          <Drawer.Header className="flex-row items-center justify-between gap-4">
            <Drawer.Title>
              <QuestionName
                index={index}
                formPathPrefix={`${prefix}.questions`}
              />
            </Drawer.Title>
            <Drawer.Close
              render={<Button type="button" variant="outline" size="sm" />}
            >
              <Trans message="Save & close" />
            </Drawer.Close>
          </Drawer.Header>
          <Drawer.Body>
            <EditQuestionForm formPathPrefix={formPathPrefix} />
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              type="button"
              variant="outline"
              color="danger"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                // Wait for drawer fields to unmount before removing RHF values.
                setTimeout(() => onDelete(), 160);
              }}
            >
              <Trans message="Delete question" />
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

type EditQuestionFormProps = {
  formPathPrefix: string;
};
function EditQuestionForm({formPathPrefix}: EditQuestionFormProps) {
  return (
    <Field.Group>
      <HookForm.Field name={`${formPathPrefix}.question`}>
        <Field.Label>
          <Trans message="Question" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${formPathPrefix}.answer`}>
        <Field.Label>
          <Trans message="Answer" />
        </Field.Label>
        <Textarea rows={6} />
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

type QuestionNameProps = {
  index: number;
  formPathPrefix: string;
};
function QuestionName({index, formPathPrefix}: QuestionNameProps) {
  const question = useWatch({
    name: `${formPathPrefix}.${index}.question`,
  });
  return (
    question || (
      <Trans message="Question :number" values={{number: index + 1}} />
    )
  );
}
