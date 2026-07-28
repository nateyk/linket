import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Form} from '@ui/forms/form';
import {Trans} from '@ui/i18n/trans';
import clsx from 'clsx';
import {ComponentProps, Fragment, ReactElement, ReactNode} from 'react';
import {
  FieldValues,
  SubmitHandler,
  useFormContext,
  UseFormReturn,
} from 'react-hook-form';

interface Props<T extends FieldValues> {
  onSubmit: SubmitHandler<T>;
  form: UseFormReturn<T>;
  title: ReactElement;
  tabs?: ReactNode;
  isLoading: boolean;
  children: ReactNode;
  actions?: ReactNode;
  disableSaveWhenNotDirty?: boolean;
  wrapInContainer?: boolean;
  submitButtonText?: ReactNode;
  className?: string;
  containerClassName?: string;
  containerMaxWidth?: string;
  navbar?: ReactNode;
}
export function CrupdateResourceLayout<T extends FieldValues>({
  onSubmit,
  form,
  title,
  tabs,
  children,
  actions,
  isLoading = false,
  disableSaveWhenNotDirty = false,
  wrapInContainer = true,
  submitButtonText,
  className,
  containerClassName,
  navbar,
  containerMaxWidth = 'max-w-6xl',
}: Props<T>) {
  const isDirty = !disableSaveWhenNotDirty
    ? true
    : Object.keys(form.formState.dirtyFields).length;

  const saveButton = (
    <Button
      variant="default"
      color="primary"
      type="submit"
      disabled={isLoading || !isDirty}
    >
      {submitButtonText ?? <Trans message="Save" />}
    </Button>
  );

  return (
    <Form
      onSubmit={onSubmit}
      onBeforeSubmit={() => form.clearErrors()}
      form={form}
      className={clsx('flex h-full flex-col', className)}
    >
      {navbar}
      <CrupdateResourceHeader
        endActions={
          <Fragment>
            {actions}
            {saveButton}
          </Fragment>
        }
        border={tabs ? 'border-none' : undefined}
      >
        {title}
      </CrupdateResourceHeader>
      {tabs && <div className="shrink-0">{tabs}</div>}
      <div className="overflow-y-auto">
        <div
          className={clsx(
            wrapInContainer
              ? `${containerMaxWidth} mx-auto px-6 py-14`
              : undefined,
            containerClassName,
          )}
        >
          {children}
        </div>
      </div>
    </Form>
  );
}

interface CrupdateResourceHeaderProps {
  children: ReactElement;
  endActions?: ReactNode;
  border?: string;
}
export function CrupdateResourceHeader({
  children,
  endActions,
  border,
}: CrupdateResourceHeaderProps) {
  return (
    <DashboardLayout.SectionHeader className={border}>
      <DashboardLayout.SidebarToggle />
      <DashboardLayout.SectionTitle>{children}</DashboardLayout.SectionTitle>
      {endActions}
    </DashboardLayout.SectionHeader>
  );
}

interface CrupdateResourceSectionProps {
  label: ReactElement;
  labelMargin?: string;
  children: ReactNode;
  margin?: string;
}

export function CrupdateResourceSection({
  label,
  children,
  margin = 'mb-12',
  labelMargin = 'mb-4',
}: CrupdateResourceSectionProps) {
  return (
    <section className={clsx(margin)}>
      <div className={clsx(labelMargin, 'text-lg font-semibold')}>{label}</div>
      {children}
    </section>
  );
}

interface DirtyFormSaveDrawerProps {
  saveButton?: ReactElement<ComponentProps<typeof Button>>;
  isLoading?: boolean;
}
export function DirtyFormSaveDrawer({
  saveButton,
  isLoading,
}: DirtyFormSaveDrawerProps) {
  const {formState, reset} = useFormContext();
  const isDirty =
    formState.isDirty && Object.keys(formState.dirtyFields).length > 0;
  return (
    isDirty && (
      <div className="fixed right-0 bottom-6 left-0 z-10 mx-auto flex w-max max-w-[calc(100vw-32px)] min-w-3xl animate-in items-center gap-2 rounded-card border bg-background p-3 text-sm shadow-lg slide-in-from-bottom">
        <div className="mr-auto text-sm font-semibold text-muted-foreground">
          <Trans message="Unsaved changes" />
        </div>
        <Button variant="outline" size="sm" onClick={() => reset()}>
          <Trans message="Discard" />
        </Button>
        {saveButton ?? (
          <Button
            variant="default"
            color="primary"
            type="submit"
            size="sm"
            disabled={isLoading}
          >
            <Trans message="Save changes" />
          </Button>
        )}
      </div>
    )
  );
}
