import {SvgIconProps} from '@common/ui/library/icons/svg-icon';
import {ReactElement, ReactNode} from 'react';

interface Props {
  icon: ReactElement<SvgIconProps>;
  title: ReactElement;
  description: ReactElement;
  children: ReactNode;
  action: ReactElement;
}
export function KnowledgePageSectionLayout({
  icon,
  title,
  description,
  children,
  action,
}: Props) {
  return (
    <div className="rounded-card border p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <div className="text-base font-semibold leading-6">{title}</div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="md:ms-auto">{action}</div>
      </div>
      <div className="mt-2 divide-y empty:hidden">{children}</div>
    </div>
  );
}
