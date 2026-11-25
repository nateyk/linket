import {LandingPageImageSelector} from '@common/admin/settings/landing-page-settings/landing-page-image-selector';
import {Button} from '@shadcn/button/button';
import {Drawer} from '@shadcn/drawer/drawer';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {ChevronRight, PlusIcon} from 'lucide-react';
import {useState} from 'react';
import {useFieldArray, useWatch} from 'react-hook-form';

export function CreatorStoriesSettings({index}: {index: number}) {
  const prefix =
    `client.landingPage.sections.${index}` as `client.landingPage.sections.${number}`;
  const {fields, append, remove} = useFieldArray({name: `${prefix}.stories`});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <Field.Group>
      <HookForm.Field name={`${prefix}.badge`}>
        <Field.Label><Trans message="Badge" /></Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name={`${prefix}.title`}>
        <Field.Label><Trans message="Title" /></Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name={`${prefix}.description`}>
        <Field.Label><Trans message="Description" /></Field.Label>
        <Textarea rows={3} />
        <Field.Error />
      </HookForm.Field>

      <Field.Separator />
      <p className="text-sm leading-6 text-muted-foreground">
        <Trans message="Only publish genuine creator storefronts with permission. Add a real screenshot and a same-site /storefront path. Optional quotes must be provided by the creator. Stories remain hidden until explicitly approved." />
      </p>
      <div className="flex flex-col gap-2">
        <Field.Title><Trans message="Creator stories" /></Field.Title>
        {fields.map((field, storyIndex) => (
          <StoryEditor
            key={field.id}
            path={`${prefix}.stories.${storyIndex}`}
            index={storyIndex}
            open={activeIndex === storyIndex}
            setOpen={open => setActiveIndex(open ? storyIndex : null)}
            onDelete={() => {
              remove(storyIndex);
              setActiveIndex(null);
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
              creatorName: '',
              role: '',
              quote: '',
              storefrontPath: '',
              approved: false,
            });
            setActiveIndex(fields.length);
          }}
        >
          <PlusIcon />
          <Trans message="Add creator story" />
        </Button>
      </div>
    </Field.Group>
  );
}

type StoryEditorProps = {
  index: number;
  path: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onDelete: () => void;
};

function StoryEditor({index, path, open, setOpen, onDelete}: StoryEditorProps) {
  const name = useWatch({name: `${path}.creatorName`});
  const approved = useWatch({name: `${path}.approved`});
  return (
    <Drawer.Root position="right" open={open} onOpenChange={setOpen}>
      <Drawer.Trigger render={<Button type="button" variant="outline" className="w-full justify-start" />}>
        <span className="truncate">{name || `Creator ${index + 1}`}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {approved ? <Trans message="Approved" /> : <Trans message="Draft" />}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Content>
          <Drawer.Header className="flex-row items-center justify-between gap-4">
            <Drawer.Title>{name || <Trans message="Creator story" />}</Drawer.Title>
            <Drawer.Close render={<Button type="button" variant="outline" size="sm" />}>
              <Trans message="Save & close" />
            </Drawer.Close>
          </Drawer.Header>
          <Drawer.Body>
            <Field.Group>
              <HookForm.Field name={`${path}.creatorName`}>
                <Field.Label><Trans message="Creator name" /></Field.Label>
                <Input />
                <Field.Error />
              </HookForm.Field>
              <HookForm.Field name={`${path}.role`}>
                <Field.Label><Trans message="Creator role (optional)" /></Field.Label>
                <Input />
                <Field.Error />
              </HookForm.Field>
              <HookForm.Field name={`${path}.storefrontPath`}>
                <Field.Label><Trans message="Public Linket storefront path" /></Field.Label>
                <Input placeholder="/creator-slug" />
                <Field.Description>
                  <Trans message="Use only a real, public Linket path beginning with /; external links are not supported." />
                </Field.Description>
                <Field.Error />
              </HookForm.Field>
              <LandingPageImageSelector
                formPrefix={path}
                label={<Trans message="Approved storefront screenshot" />}
              />
              <HookForm.Field name={`${path}.imageAlt`}>
                <Field.Label><Trans message="Screenshot alternative text" /></Field.Label>
                <Input placeholder="Describe the actual storefront screenshot" />
                <Field.Error />
              </HookForm.Field>
              <HookForm.Field name={`${path}.quote`}>
                <Field.Label><Trans message="Creator-provided quote (optional)" /></Field.Label>
                <Textarea rows={4} />
                <Field.Error />
              </HookForm.Field>
              <HookForm.Field name={`${path}.approved`}>
                <Field.Label>
                  <Switch />
                  <Trans message="Approved by creator for public display" />
                </Field.Label>
                <Field.Error />
              </HookForm.Field>
            </Field.Group>
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              type="button"
              variant="outline"
              color="danger"
              size="sm"
              onClick={() => {
                setOpen(false);
                setTimeout(onDelete, 160);
              }}
            >
              <Trans message="Delete story" />
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
