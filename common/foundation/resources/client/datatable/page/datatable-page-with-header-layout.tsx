import {ToggleDashboardSidebarButton} from '@common/datatable/page/toggle-dashboard-sidebar-button';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import clsx from 'clsx';
import {ReactNode, useContext} from 'react';

function useLinketDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext);
  if (ctx && 'leftSidebar' in ctx) {
    return ctx;
  }
  return null;
}

interface DatatablePageWithHeaderLayoutProps {
  children: ReactNode;
  className?: string;
}
export function DatatablePageWithHeaderLayout({
  children,
  className,
}: DatatablePageWithHeaderLayoutProps) {
  const linketLayout = useLinketDashboardLayout();

  if (linketLayout) {
    return (
      <DashboardLayout.MainSection className={clsx('relative', className)}>
        {children}
      </DashboardLayout.MainSection>
    );
  }

  return (
    <div className={clsx('flex h-full flex-col', className)}>{children}</div>
  );
}

export function DatatablePageScrollContainer({
  children,
}: {
  children: ReactNode;
}) {
  const linketLayout = useLinketDashboardLayout();

  if (linketLayout) {
    return (
      <DashboardLayout.SectionScrollContainer>
        {children}
      </DashboardLayout.SectionScrollContainer>
    );
  }

  return <div className="flex-auto overflow-y-auto">{children}</div>;
}

export type BodyProps = {
  children: ReactNode;
};
export function DatatablePageWithHeaderBody({children}: BodyProps) {
  const linketLayout = useLinketDashboardLayout();

  if (linketLayout) {
    return (
      <DashboardLayout.SectionContent>{children}</DashboardLayout.SectionContent>
    );
  }

  return (
    <div className="flex min-h-0 flex-auto flex-col p-3 md:p-6">
      {children}
    </div>
  );
}

interface DatatablePageHeaderBarProps {
  title?: ReactNode;
  children?: ReactNode;
  showSidebarToggleButton?: boolean;
  titleId?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  border?: string;
  padding?: string;
  className?: string;
  toggleButton?: ReactNode;
}
export function DatatablePageHeaderBar({
  title,
  children,
  showSidebarToggleButton = false,
  titleId,
  leftContent,
  rightContent,
  border = 'border-b',
  padding,
  className,
  toggleButton,
}: DatatablePageHeaderBarProps) {
  const linketLayout = useLinketDashboardLayout();

  if (!toggleButton) {
    toggleButton = showSidebarToggleButton ? (
      linketLayout ? (
        <DashboardLayout.SidebarToggle />
      ) : (
        <ToggleDashboardSidebarButton />
      )
    ) : null;
  }

  const titleContent = title || children;

  if (linketLayout) {
    return (
      <DashboardLayout.SectionHeader className={className}>
        {toggleButton}
        {titleContent ? (
          <DashboardLayout.SectionTitle id={titleId}>
            {titleContent}
          </DashboardLayout.SectionTitle>
        ) : null}
        {leftContent}
        {rightContent ? (
          <div className="ml-auto flex items-center gap-2">{rightContent}</div>
        ) : null}
      </DashboardLayout.SectionHeader>
    );
  }

  return (
    <div
      className={clsx(
        'flex h-14 shrink-0 items-center gap-2',
        padding
          ? padding
          : showSidebarToggleButton
            ? 'ps-2 pe-3 md:ps-5 md:pe-6'
            : 'px-3 md:px-6',
        border,
        className,
      )}
    >
      {toggleButton}
      {titleContent && (
        <h1
          id={titleId}
          className={clsx(
            'me-2 min-w-0 truncate text-xl font-semibold first:capitalize',
            // Pull breadcrumb flush only when there is no sidebar toggle overlapping it.
            !showSidebarToggleButton && '[&_.breadcrumb-root]:-ms-1.5',
            // need to expand for breadcrumbs to work properly
            !leftContent && 'flex-auto',
          )}
        >
          {titleContent}
        </h1>
      )}
      {leftContent}
      {rightContent && (
        <div className="ms-auto flex items-center gap-2">{rightContent}</div>
      )}
    </div>
  );
}
