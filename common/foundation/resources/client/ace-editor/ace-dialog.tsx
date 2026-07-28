import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import React, {ReactNode, RefObject, Suspense, useState} from 'react';
import type ReactAce from 'react-ace';

export const AceEditor = React.lazy(() => import('./ace-editor'));

interface TextEditorSourcecodeDialogProps {
  defaultValue: string;
  mode?: 'css' | 'html' | 'php_laravel_blade';
  title: ReactNode;
  onSave?: (value?: string) => void;
  isSaving?: boolean;
  footerStartAction?: ReactNode;
  beautify?: boolean;
  editorRef?: RefObject<ReactAce | null>;
  children?: Dialog.TriggerElement;
}

type ContentProps = Omit<
  TextEditorSourcecodeDialogProps,
  'children' | 'mode'
> & {
  mode: NonNullable<TextEditorSourcecodeDialogProps['mode']>;
};

export function AceDialog({
  defaultValue,
  mode = 'html',
  title,
  onSave,
  isSaving,
  footerStartAction,
  beautify,
  editorRef,
  children,
}: TextEditorSourcecodeDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Content
          defaultValue={defaultValue}
          mode={mode}
          title={title}
          onSave={value => {
            onSave?.(value);
            setOpen(false);
          }}
          isSaving={isSaving}
          footerStartAction={footerStartAction}
          beautify={beautify}
          editorRef={editorRef}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Content({
  defaultValue,
  mode,
  title,
  onSave,
  isSaving,
  footerStartAction,
  beautify,
  editorRef,
}: ContentProps) {
  const [value, setValue] = useState(defaultValue);
  const [isValid, setIsValid] = useState<boolean>(true);

  return (
    <Dialog.Content className="h-full w-full gap-0 sm:max-w-7xl">
      <Dialog.Header className="mb-6">
        <Dialog.Title>{title}</Dialog.Title>
      </Dialog.Header>
      <div className="relative -mx-6 flex-auto">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <Spinner aria-label="Loading editor..." className="size-5" />
            </div>
          }
        >
          <AceEditor
            beautify={beautify}
            mode={mode}
            onChange={newValue => setValue(newValue)}
            defaultValue={value || ''}
            onIsValidChange={setIsValid}
            editorRef={editorRef}
          />
        </Suspense>
      </div>
      <Footer
        disabled={!isValid || isSaving}
        value={value}
        onSave={onSave}
        startAction={footerStartAction}
      />
    </Dialog.Content>
  );
}

interface FooterProps {
  disabled: boolean | undefined;
  value?: string;
  onSave?: (value?: string) => void;
  startAction?: ReactNode;
}
function Footer({disabled, value, onSave, startAction}: FooterProps) {
  return (
    <Dialog.Footer variant="muted">
      {startAction && <div className="me-auto">{startAction}</div>}
      <Dialog.CloseButton render={<Button variant="outline" />}>
        <Trans message="Cancel" />
      </Dialog.CloseButton>
      <Button
        disabled={disabled}
        onClick={() => {
          onSave?.(value);
        }}
      >
        <Trans message="Save" />
      </Button>
    </Dialog.Footer>
  );
}
