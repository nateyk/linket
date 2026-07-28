import {ReactNode} from 'react';

interface BillingPlanPanelProps {
  title: ReactNode;
  children: ReactNode;
}
export function BillingPlanPanel({title, children}: BillingPlanPanelProps) {
  return (
    <div className="mb-16">
      <div className="text-sm font-medium uppercase pb-4 mb-4 border-b">
        {title}
      </div>
      {children}
    </div>
  );
}
