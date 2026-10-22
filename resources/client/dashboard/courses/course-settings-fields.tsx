import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {FormatDropdown} from '@common/text-editor/menubar/format-dropdown';
import {LinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {CroppedCover} from '@common/uploads/components/cropped-image-selector';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useSortable} from '@ui/interactions/dnd/sortable/use-sortable';
import {GripVerticalIcon, XIcon} from 'lucide-react';
import {useRef, useState} from 'react';

function CourseSettingsDescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TipTapEditorProvider
      extensions={articleEditorTipTapExtensions}
      initialContent={value}
      onChange={onChange}
    >
      <div className="flex flex-col">
        <div className="no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-b px-1.5 py-1 text-muted-foreground">
          <FormatDropdown />
          <Divider />
          <FontStyleButtons />
          <Divider />
          <ListButtons />
          <Divider />
          <LinkButton />
          <Divider />
          <ClearFormatButton />
        </div>
        <TiptapEditorContent className="prose prose-sm min-h-[180px] max-w-[60ch] px-3 py-2.5 dark:prose-invert" />
      </div>
    </TipTapEditorProvider>
  );
}

export function CourseSettingsDescriptionField({
  inputId,
  value,
  onChange,
}: {
  inputId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field.Root>
      <Field.Label htmlFor={`${inputId}-description`}>
        <Trans message="Description" />
      </Field.Label>
      <CourseSettingsDescriptionEditor value={value} onChange={onChange} />
    </Field.Root>
  );
}

function SortableOutcomeItem({
  id,
  items,
  disabled,
  onSortEnd,
  children,
}: {
  id: string;
  items: string[];
  disabled: boolean;
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  children: (dragHandleRef: React.RefObject<HTMLButtonElement | null>) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {sortableProps, dragHandleRef} = useSortable({
    item: id,
    items,
    type: 'course-builder-outcomes',
    ref,
    disabled,
    onSortEnd,
  });

  return (
    <div ref={ref} {...sortableProps}>
      {children(dragHandleRef)}
    </div>
  );
}

function OutcomesChipList({
  outcomes,
  onChange,
}: {
  outcomes: {id: string; text: string}[];
  onChange: (outcomes: {id: string; text: string}[]) => void;
}) {
  const [newOutcome, setNewOutcome] = useState('');
  const MAX_OUTCOMES = 8;

  const addOutcome = () => {
    if (!newOutcome.trim() || outcomes.length >= MAX_OUTCOMES) return;
    const newItem = { id: crypto.randomUUID(), text: newOutcome.trim() };
    onChange([...outcomes, newItem]);
    setNewOutcome('');
  };

  const removeOutcome = (id: string) => {
    onChange(outcomes.filter(item => item.id !== id));
  };

  const handleReorder = (oldIndex: number, newIndex: number) => {
    const newOutcomes = [...outcomes];
    const [removed] = newOutcomes.splice(oldIndex, 1);
    newOutcomes.splice(newIndex, 0, removed);
    onChange(newOutcomes);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={newOutcome}
          onChange={e => setNewOutcome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addOutcome()}
          placeholder="e.g. Build and launch your first course"
          disabled={outcomes.length >= MAX_OUTCOMES}
        />
        <Button
          type="button"
          onClick={addOutcome}
          disabled={!newOutcome.trim() || outcomes.length >= MAX_OUTCOMES}
        >
          <Trans message="Add" />
        </Button>
        {outcomes.length >= MAX_OUTCOMES && (
          <span className="text-xs text-muted-foreground self-center">
            <Trans message="Maximum of 8 outcomes reached" />
          </span>
        )}
      </div>
      {outcomes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {outcomes.map(item => (
            <SortableOutcomeItem
              key={item.id}
              id={item.id}
              items={outcomes.map(o => o.id)}
              disabled={false}
              onSortEnd={handleReorder}
            >
              {dragHandleRef => (
                <div className="flex items-center gap-1.5 rounded-card-sm border bg-background px-2.5 py-1 text-sm">
                  <button
                    ref={dragHandleRef}
                    type="button"
                    aria-label="Reorder outcome"
                    className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
                  >
                    <GripVerticalIcon className="size-3.5" />
                  </button>
                  <span>{item.text}</span>
                  <button
                    type="button"
                    onClick={() => removeOutcome(item.id)}
                    aria-label="Remove outcome"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              )}
            </SortableOutcomeItem>
          ))}
        </div>
      )}
    </div>
  );
}

export function CourseSettingsOutcomesField({
  outcomes,
  onChange,
}: {
  outcomes: {id: string; text: string}[];
  onChange: (outcomes: {id: string; text: string}[]) => void;
}) {
  return (
    <Field.Root>
      <Field.Label>
        <Trans message="What you'll learn" />
      </Field.Label>
      <Field.Description>
        <Trans message="Add up to 8 outcome bullets that students will achieve." />
      </Field.Description>
      <OutcomesChipList outcomes={outcomes} onChange={onChange} />
    </Field.Root>
  );
}

export function CourseSettingsCoverField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string, fileId: number | null) => void;
}) {
  const {trans} = useTrans();
  return (
    <Field.Root>
      <Field.Label>
        <Trans message="Cover image" />
      </Field.Label>
      <CroppedCover
        value={value}
        onChange={(url, entry) => {
          onChange(url, entry?.id ?? null);
        }}
        uploadType="linkImages"
        aspect={16 / 9}
        label={trans(message('Cover image'))}
      />
      <Field.Description>
        <Trans message="Recommended size: 1200×675 (16:9) · Max 5MB" />
      </Field.Description>
    </Field.Root>
  );
}
