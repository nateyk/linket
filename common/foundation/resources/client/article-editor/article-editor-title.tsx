import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {useTrans} from '@ui/i18n/use-trans';
import clsx from 'clsx';
import {PencilIcon} from 'lucide-react';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';

export function ArticleEditorTitle() {
  const [editingTitle, setEditingTitle] = useState(false);
  const {trans} = useTrans();
  const form = useFormContext<{title: string}>();
  const watchedTitle = form.watch('title');

  const titlePlaceholder = trans({message: 'Title'});

  const title = editingTitle ? (
    <HookForm.Field name="title">
      <Input
        placeholder={titlePlaceholder}
        autoFocus
        className="h-10"
        onBlur={() => {
          setEditingTitle(false);
        }}
        required
      />
    </HookForm.Field>
  ) : (
    <h1
      tabIndex={0}
      onClick={() => {
        setEditingTitle(true);
      }}
      onFocus={() => {
        setEditingTitle(true);
      }}
      className={clsx(
        'flex cursor-pointer items-center gap-2 rounded-input hover:bg-primary/focus',
        !watchedTitle && 'text-muted-foreground',
      )}
    >
      {watchedTitle || titlePlaceholder}
      <PencilIcon className="text-muted-foreground" />
    </h1>
  );

  return (
    <div className="mx-auto my-12 prose w-full shrink-0 px-6 dark:prose-invert">
      {title}
    </div>
  );
}
