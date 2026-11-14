import {Empty} from '@shadcn/empty/empty';
import {BookOpenIcon} from 'lucide-react';
import type {ReactNode} from 'react';

interface Props {
  title?: ReactNode;
  description?: ReactNode;
}

/** Use the same neutral empty-state pattern as the admin dashboard. */
export function HcManagerEmptyMessage({title, description}: Props) {
  return (
    <Empty.Root className="min-h-56 border-0 p-6">
      <Empty.Header>
        <Empty.Media variant="icon">
          <BookOpenIcon aria-hidden="true" />
        </Empty.Media>
        {title && <Empty.Title>{title}</Empty.Title>}
        {description && <Empty.Description>{description}</Empty.Description>}
      </Empty.Header>
    </Empty.Root>
  );
}
