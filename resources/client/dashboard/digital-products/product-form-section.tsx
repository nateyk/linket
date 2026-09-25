// resources/client/dashboard/digital-products/product-form-section.tsx
import {BuilderSectionHeader} from '@app/dashboard/stores/store-editor/builder-section-header';
import {Accordion} from '@shadcn/accordion/accordion';
import {Badge} from '@shadcn/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

export type ProductSetupSection = 'details' | 'files' | 'bio-pages';

interface ProductFormSectionProps {
  id: ProductSetupSection;
  title: string;
  description: string;
  icon: LucideIcon;
  isComplete: boolean;
  count?: number | null;
  hasError?: boolean;
  children: ReactNode;
}

export function ProductFormSection({
  id,
  title,
  description,
  icon,
  isComplete,
  count,
  hasError = false,
  children,
}: ProductFormSectionProps) {
  return (
    <Accordion.Item
      value={id}
      className={cn(hasError && 'border-destructive/40')}
    >
      <Accordion.Trigger>
        <BuilderSectionHeader
          icon={icon}
          isComplete={isComplete}
          title={<Trans message={title} />}
          description={<Trans message={description} />}
          trailing={
            count !== null && count !== undefined && count > 0 ? (
              <Badge
                variant="secondary"
                className="h-4 min-w-[16px] px-1"
              >
                {count}
              </Badge>
            ) : undefined
          }
        />
      </Accordion.Trigger>
      <Accordion.Content className="border-t pt-4">
        <div className="max-w-2xl">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
