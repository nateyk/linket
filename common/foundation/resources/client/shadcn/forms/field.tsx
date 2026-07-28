import {cva, type VariantProps} from 'class-variance-authority';

import {Field as FieldPrimitive} from '@base-ui/react/field';
import {Fieldset as FieldsetPrimitive} from '@base-ui/react/fieldset';
import {Separator} from '@common/shadcn/separator';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Label} from '@shadcn/forms/label';
import {cn} from '@ui/utils/cn';
import {useContext} from 'react';

function FieldSetRoot({className, ...props}: FieldsetPrimitive.Root.Props) {
  return (
    <FieldsetPrimitive.Root
      data-slot="field-set"
      className={cn(
        'flex flex-col gap-6 has-data-[slot=checkbox-group]:gap-3 has-data-[slot=radio-group]:gap-3',
        className,
      )}
      {...props}
    />
  );
}

function FieldSetLegend({
  className,
  variant = 'legend',
  ...props
}: FieldsetPrimitive.Legend.Props & {variant?: 'legend' | 'label'}) {
  return (
    <FieldsetPrimitive.Legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "flex items-center gap-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function FieldSetDescription({className, ...props}: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="field-set-description"
      className={cn(
        '-mt-5 text-start text-sm text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function FieldGroup({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva(
  'group/field flex w-full gap-2 data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
        horizontal:
          'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        responsive:
          'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  },
);

function FieldRoot({
  className,
  orientation = 'vertical',
  ...props
}: FieldPrimitive.Root.Props & VariantProps<typeof fieldVariants>) {
  return (
    <FieldPrimitive.Root
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({orientation}), className)}
      {...props}
    />
  );
}

const fieldLabelVariants = cva(
  'group/field-label peer/field-label group-data-[disabled=true]/field:opacity-50',
  {
    variants: {
      variant: {
        card: 'grid grid-cols-12 gap-y-1 rounded-card-sm border p-4 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 [&_[data-slot=field-description]]:col-span-12 [&_[data-slot=field-label]]:col-span-11 [&_[data-slot=radio-group-item]]:col-span-1 [&_[data-slot=radio-group-item]]:ml-auto [&_[data-slot=switch]]:col-span-2 [&_[data-slot=switch]]:ml-auto [&:has([data-slot=switch])_[data-slot=field-label]]:col-span-10',
        label:
          'flex w-fit gap-2 leading-snug has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      },
      defaultVariants: {
        variant: 'label',
      },
    },
  },
);
function FieldLabel({
  className,
  variant = 'label',
  ...props
}: React.ComponentProps<typeof Label> & {variant?: 'card' | 'label'}) {
  return (
    <FieldPrimitive.Label
      render={<Label />}
      data-slot="field-label"
      className={cn(fieldLabelVariants({variant}), className)}
      {...props}
    />
  );
}

function FieldTitle({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({className, ...props}: React.ComponentProps<'p'>) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn(
        'text-start text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance',
        'last:mt-0 nth-last-2:-mt-1',
        '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({className, ...props}: FieldPrimitive.Error.Props) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedError = hookFieldCtx?.error ? hookFieldCtx.error : props.children;
  const mergedClassName = cn('text-sm font-normal text-destructive', className);
  if (mergedError) {
    return (
      <FieldPrimitive.Error
        role="alert"
        data-slot="field-error"
        className={mergedClassName}
        match
        {...props}
      >
        {mergedError}
      </FieldPrimitive.Error>
    );
  }
  // need to return baseui error with no children, otherwise it will not render native html error messages
  return (
    <FieldPrimitive.Error
      role="alert"
      data-slot="field-error"
      className={cn('text-sm font-normal text-destructive', className)}
      {...props}
    />
  );
}

function FieldItem({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <FieldPrimitive.Item
      data-slot="field-item"
      className={cn('flex w-full flex-col gap-0.5', className)}
      {...props}
    />
  );
}

export const Field = {
  Root: FieldRoot,
  Description: FieldDescription,
  Error: FieldError,
  Group: FieldGroup,
  Item: FieldItem,
  Label: FieldLabel,
  Separator: FieldSeparator,
  Title: FieldTitle,
};

export const FieldSet = {
  Root: FieldSetRoot,
  Legend: FieldSetLegend,
  Description: FieldSetDescription,
};
