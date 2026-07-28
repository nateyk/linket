import {mergeProps} from '@base-ui/react/merge-props';
import {useRender} from '@base-ui/react/use-render';
import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {ToggleLeftSidebarIcon} from '@ui/icons/toggle-left-sidebar-icon';
import {ToggleRightSidebarIcon} from '@ui/icons/toggle-right-sidebar-icon';
import {cn} from '@ui/utils/cn';
import {CheckCheckIcon, XIcon} from 'lucide-react';
import {ComponentProps, ComponentPropsWithoutRef, ReactNode, use} from 'react';
import {
  DashboardLayoutContext,
  DashboardLayoutContextProvider,
  DashboardSectionVariant,
  DashboardSidebarStatus,
} from './dashboard-layout-context';

interface DashboardLayoutProps extends ComponentPropsWithoutRef<'div'> {
  name: string;
  defaultLeftSidebarStatus?: DashboardSidebarStatus;
  defaultRightSidebarStatus?: DashboardSidebarStatus;
  defaultSectionVariant?: DashboardSectionVariant;
}
function Root({
  children,
  name,
  className,
  defaultLeftSidebarStatus,
  defaultRightSidebarStatus,
  defaultSectionVariant,
  ...domProps
}: DashboardLayoutProps) {
  return (
    <DashboardLayoutContextProvider
      name={name}
      defaultLeftSidebarStatus={defaultLeftSidebarStatus}
      defaultRightSidebarStatus={defaultRightSidebarStatus}
      defaultSectionVariant={defaultSectionVariant}
    >
      {({isMobileMode}) => (
        <div
          {...domProps}
          className={cn(
            'group/dashboard-layout relative isolate flex h-screen flex-col overflow-hidden bg-background',
            !isMobileMode &&
              'has-data-[variant=floating]:gap-2 has-data-[variant=floating]:p-2 light:has-data-[variant=floating]:bg-muted light:has-data-[variant=inset]:bg-muted',
            className,
          )}
        >
          {children}
        </div>
      )}
    </DashboardLayoutContextProvider>
  );
}

function Content({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dashboard-content"
      className={cn(
        'flex min-h-0 flex-1 has-data-[variant=floating]:gap-2',
        className,
      )}
      {...props}
    />
  );
}

function Navbar({
  className,
  variant: propsVariant,
  ...props
}: ComponentProps<'div'> & {
  variant?: Omit<DashboardSectionVariant, 'floating'>;
}) {
  const {defaultSectionVariant} = use(DashboardLayoutContext);
  const variant =
    propsVariant ??
    (defaultSectionVariant === 'floating' ? 'inset' : defaultSectionVariant);
  return (
    <div
      data-slot="navbar"
      data-variant={variant}
      className={cn(
        'flex items-center gap-4 px-2',
        className,
        variant === 'default' && 'border-b bg-background py-2',
      )}
      {...props}
    />
  );
}

type SectionProps = useRender.ComponentProps<'section'> & {
  variant?: DashboardSectionVariant;
};
function Section({
  className,
  variant: propsVariant,
  render,
  ...props
}: SectionProps) {
  const {defaultSectionVariant, isMobileMode} = use(DashboardLayoutContext);
  const variant = propsVariant ?? defaultSectionVariant;
  return useRender({
    defaultTagName: 'section',
    props: mergeProps<'section'>(
      {
        className: cn(
          'flex h-full min-h-0 min-w-0 flex-col bg-background [--section-spacing:--spacing(4)] md:[--section-spacing:--spacing(6)]',
          variant === 'floating' &&
            !isMobileMode &&
            'rounded-card bg-card shadow-sm dark:bg-card',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'dashboard-section',
      variant,
    },
  });
}

function MainSection({className, ...props}: SectionProps) {
  return <Section className={cn('flex-1', className)} {...props} />;
}

function SectionHeader({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        'flex h-14 w-full shrink-0 items-center gap-2 border-b px-(--section-spacing) **:data-[slot="breadcrumb"]:font-semibold **:data-[slot="sidebar-toggle-button"]:-ml-1',
        className,
      )}
      {...props}
    />
  );
}

function SectionTitle({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          'flex flex-1 items-center gap-1 truncate text-xl font-semibold',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'section-title',
    },
  });
}

function SectionContent({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="section-content"
      className={cn(
        'flex min-h-0 flex-auto flex-col gap-(--section-spacing) p-(--section-spacing) not-[data-slot="section-scroll-container"]:overflow-y-auto',
        className,
      )}
      {...props}
    />
  );
}

function SectionContentHeader({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="section-content-header"
      className={cn('flex shrink-0 flex-wrap items-center gap-3', className)}
      {...props}
    />
  );
}

function SectionScrollContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="section-scroll-container"
      className={cn(
        '-mx-(--section-spacing) flex-auto scrollbar-thumb-foreground/20 scrollbar-track-transparent overflow-y-auto px-(--section-spacing)',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SidebarToggle({
  sidebar: sidebarName = 'left',
  children,
}: {
  sidebar?: 'left' | 'right';
  children?: ReactNode;
}) {
  const ctx = use(DashboardLayoutContext);
  if (!ctx) return null;
  const sidebar = sidebarName === 'left' ? ctx.leftSidebar : ctx.rightSidebar;

  const defaultIcon =
    sidebarName === 'left' ? (
      <ToggleLeftSidebarIcon />
    ) : (
      <ToggleRightSidebarIcon />
    );

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        data-slot="sidebar-toggle-button"
        render={<Button variant="ghost" size="icon-sm" />}
        onClick={() => sidebar.toggleStatus()}
      >
        {children || defaultIcon}
      </Tooltip.Trigger>
      <Tooltip.Content>
        {sidebar.status === 'collapsed' ? (
          <Trans message="Expand sidebar" />
        ) : (
          <Trans message="Collapse sidebar" />
        )}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

type FloatingActionsProps = {
  selectedItemsCount: number;
  children: ReactNode;
  onClear: () => void;
  onSelectAll?: () => void;
};
function FloatingActions({
  selectedItemsCount,
  children,
  onClear,
  onSelectAll,
}: FloatingActionsProps) {
  return (
    <FloatindDrawer>
      <Button
        onClick={() => onClear()}
        variant="ghost"
        size="icon-sm"
        className="mr-1.5"
      >
        <XIcon />
      </Button>
      <div className="mr-auto pr-12 font-medium">
        <Trans
          message="[one 1 item|other :count items] selected"
          values={{count: selectedItemsCount}}
        />
      </div>

      <div className="flex items-center gap-2">
        {onSelectAll ? (
          <Tooltip.Root>
            <Tooltip.Trigger
              onClick={() => onSelectAll()}
              render={<Button variant="outline" size="icon-sm" />}
            >
              <CheckCheckIcon />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <Trans message="Select all" />
            </Tooltip.Content>
          </Tooltip.Root>
        ) : null}
        {children}
      </div>
    </FloatindDrawer>
  );
}

function FloatindDrawer({children}: {children: ReactNode}) {
  return (
    <div className="fixed right-0 bottom-6 left-0 z-10 mx-auto flex w-max max-w-[calc(100vw-32px)] min-w-110 animate-in items-center rounded-card border bg-background p-3 text-sm shadow-lg slide-in-from-bottom">
      {children}
    </div>
  );
}

function ContainedContent({children, className}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-6xl flex-col gap-4 md:py-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export const DashboardLayout = Object.assign(Root, {
  Root,
  Navbar,
  Content,
  Section,
  SectionHeader,
  SectionTitle,
  SectionContent,
  SectionContentHeader,
  SectionScrollContainer,
  MainSection,
  SidebarToggle,
  FloatingActions,
  FloatindDrawer,
  ContainedContent,
});
