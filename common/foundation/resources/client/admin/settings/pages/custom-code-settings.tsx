import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {ProgressCircle} from '@ui/progress/progress-circle';
import React, {ReactElement, Suspense, useRef} from 'react';
import {useForm, useFormContext} from 'react-hook-form';
import {useSearchParams} from 'react-router';

const AceEditor = React.lazy(() => import('@common/ace-editor/ace-editor'));

const allTabs = [
  {
    name: 'html',
    label: <Trans message="Custom HTML & JavaScript" />,
  },
  {
    name: 'css',
    label: <Trans message="Custom CSS" />,
  },
] as const;

type TabName = (typeof allTabs)[number]['name'];

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamTab = searchParams.get('tab');
  const tabName = allTabs.some(tab => tab.name === searchParamTab)
    ? (searchParamTab as TabName)
    : 'html';

  const tabList = (
    <Tabs.Root
      value={tabName}
      onValueChange={value => {
        setSearchParams({tab: value}, {replace: true});
      }}
    >
      <div className="mx-6 border-b">
        <Tabs.List variant="line">
          {allTabs.map(tab => (
            <Tabs.Tab key={tab.name} value={tab.name}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>
    </Tabs.Root>
  );

  return <EditorLayout key={tabName} mode={tabName} tabList={tabList} />;
}

interface EditorLayoutProps {
  mode: 'css' | 'html';
  tabList: ReactElement;
}
function EditorLayout({mode, tabList}: EditorLayoutProps) {
  const {data} = useAdminSettings();
  const defaultValues =
    mode === 'css'
      ? {custom_code: {css: data.custom_code.css}}
      : {custom_code: {html: data.custom_code.html}};

  const form = useForm<AdminSettings>({
    defaultValues,
  });

  return (
    <AdminSettingsLayout
      form={form}
      title={<Trans message="Custom code" />}
      tabs={tabList}
      docsLink={AdminDocsUrls.settings.customCode}
    >
      <div className="relative h-145 overflow-hidden rounded-card-sm border">
        <CodeEditor mode={mode} />
      </div>
    </AdminSettingsLayout>
  );
}

interface CodeEditorProps {
  mode: 'css' | 'html';
}
function CodeEditor({mode}: CodeEditorProps) {
  const {setValue, getValues, setError, clearErrors} =
    useFormContext<AdminSettings>();

  // There's a bug in AceEditor, onChange is called on mount,
  // so we need to ignore it, otherwise form will be marked as dirty
  const ignoreChange = useRef(true);

  const formPath =
    mode === 'html'
      ? ('custom_code.html' as const)
      : ('custom_code.css' as const);

  return (
    <Suspense fallback={<ProgressCircle isIndeterminate />}>
      <AceEditor
        mode={mode}
        onLoad={() => {
          setTimeout(() => (ignoreChange.current = false), 10);
        }}
        onChange={newValue => {
          if (!ignoreChange.current) {
            return setValue(formPath, newValue, {shouldDirty: true});
          }
        }}
        defaultValue={getValues(formPath) || ''}
        onIsValidChange={isValid => {
          if (isValid) {
            clearErrors(formPath);
          } else {
            setError(formPath, {type: 'manual'});
          }
        }}
      />
    </Suspense>
  );
}
