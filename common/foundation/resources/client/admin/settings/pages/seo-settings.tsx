import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {loadSeoTagsOptions} from '@common/admin/settings/settings-queries';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Select} from '@shadcn/forms/select/select';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ProgressCircle} from '@ui/progress/progress-circle';
import React, {ReactElement, Suspense, useMemo, useRef} from 'react';
import type ReactAce from 'react-ace/lib/ace';
import {useForm, useFormContext} from 'react-hook-form';
import {useSearchParams} from 'react-router';

const AceEditor = React.lazy(() => import('@common/ace-editor/ace-editor'));

export function Component() {
  const {
    data: {tags},
  } = useSuspenseQuery(loadSeoTagsOptions());

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedView = searchParams.get('view') || Object.keys(tags)[0]!;

  const items = useMemo(
    () =>
      Object.keys(tags).map(key => ({
        value: key,
        label: prettyName(key),
      })),
    [tags],
  );

  return (
    <EditorLayout
      view={selectedView}
      key={selectedView}
      select={
        <Field.Root className="mb-6">
          <Field.Label>
            <Trans message="Page" />
          </Field.Label>
          <Select.Root
            items={items}
            value={selectedView}
            onValueChange={value => setSearchParams({view: value as string})}
          >
            <Select.Trigger className="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {items.map(item => (
                <Select.Item key={item.value} value={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field.Root>
      }
    />
  );
}

interface EditorLayoutProps {
  view: string;
  select: ReactElement;
}
function EditorLayout({view, select}: EditorLayoutProps) {
  const {
    data: {tags},
  } = useSuspenseQuery(loadSeoTagsOptions());

  const form = useForm<AdminSettings>({
    defaultValues: {
      seo: {
        [view]: tags[view]?.custom || tags[view]?.original,
      },
    },
  });

  return (
    <AdminSettingsLayout
      form={form}
      title={<Trans message="SEO tags" />}
      docsLink={AdminDocsUrls.settings.seo}
    >
      {select}
      <div className="mb-2 text-sm font-medium">
        <Trans message="Content" />
      </div>
      <CodeEditor view={view} />
    </AdminSettingsLayout>
  );
}

interface CodeEditorProps {
  view: string;
}
function CodeEditor({view}: CodeEditorProps) {
  const {
    data: {tags},
  } = useSuspenseQuery(loadSeoTagsOptions());
  const editorRef = useRef<ReactAce | null>(null);
  const {setValue, getValues, setError, clearErrors} =
    useFormContext<AdminSettings>();

  // There's a bug in AceEditor, onChange is called on mount,
  // so we need to ignore it, otherwise form will be marked as dirty
  const ignoreChange = useRef(true);

  return (
    <Suspense fallback={<ProgressCircle isIndeterminate />}>
      <div className="relative h-145 overflow-hidden rounded-card border">
        <AceEditor
          editorRef={editorRef}
          beautify={false}
          mode="php_laravel_blade"
          onLoad={() => {
            setTimeout(() => (ignoreChange.current = false), 10);
          }}
          onChange={newValue => {
            if (!ignoreChange.current) {
              return setValue(`seo.${view}`, newValue, {shouldDirty: true});
            }
          }}
          defaultValue={getValues(`seo.${view}`) || ''}
          onIsValidChange={isValid => {
            if (isValid) {
              clearErrors(`seo.${view}`);
            } else {
              setError(`seo.${view}`, {type: 'manual'});
            }
          }}
        />
      </div>
      <Button
        className="mt-3"
        variant="outline"
        color="primary"
        onClick={() => {
          if (editorRef.current && tags[view]) {
            editorRef.current.editor.setValue(tags[view].original);
          }
        }}
      >
        <Trans message="Reset to original" />
      </Button>
    </Suspense>
  );
}

function prettyName(name: string) {
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .split(' ')
    .filter(p => p.length > 2)
    .join(' ');
}
