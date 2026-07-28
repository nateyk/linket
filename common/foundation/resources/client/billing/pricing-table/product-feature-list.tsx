import {Product} from '@app/gen/schemas/product';
import {Trans} from '@ui/i18n/trans';
import {CheckIcon} from 'lucide-react';

interface FeatureListProps {
  product: Product;
}

export function ProductFeatureList({product}: FeatureListProps) {
  if (!product.feature_list.length) return null;

  return (
    <div className="mt-8 border-t pt-6">
      <div className="mb-2.5 text-sm font-semibold">
        <Trans message="What's included" />
      </div>
      {product.feature_list.map(feature => (
        <div key={feature} className="flex items-center gap-2.5 py-1.5 text-sm">
          <CheckIcon className="size-4 text-primary" />
          <Trans message={feature} />
        </div>
      ))}
    </div>
  );
}
