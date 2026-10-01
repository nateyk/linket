import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {CheckIcon} from 'lucide-react';
import type {PublicDigitalProduct} from '../digital-product-public-pages';
import {plainTextDescription} from './product-description';
import {ProductFaq} from './product-faq';
import {biolinkSectionTitle, biolinkSurfaceCard} from './surface';

export function ProductOverview({product}: {product: PublicDigitalProduct}) {
  const text = product.description
    ? plainTextDescription(product.description)
    : '';
  const outcomes = product.learning_outcomes?.filter(
    outcome => outcome.trim().length > 0,
  );

  return (
    <Card.Root className={biolinkSurfaceCard}>
      <Card.Content className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
        {(text || !outcomes?.length) && (
          <section className="flex min-w-0 flex-col gap-3">
            <h2 className={biolinkSectionTitle}>
              <Trans message="About this product" />
            </h2>
            {text ? (
              <p className="text-sm leading-6 whitespace-pre-line text-[var(--biolink-muted-text)]">
                {text}
              </p>
            ) : (
              <p className="text-sm text-[var(--biolink-muted-text)]">
                <Trans message="No product details have been added yet." />
              </p>
            )}
          </section>
        )}

        {outcomes && outcomes.length > 0 && (
          <section
            className={cn(
              'flex min-w-0 flex-col gap-3',
              text && 'border-t border-[var(--biolink-border)] pt-5',
            )}
          >
            <h3 className="text-sm font-semibold">
              <Trans message="What you'll learn" />
            </h3>
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {outcomes.map((outcome, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--biolink-surface)] ring-1 ring-[var(--biolink-border)]">
                    <CheckIcon
                      className="size-3 text-[var(--biolink-text)]"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-[var(--biolink-muted-text)]">
                    {outcome}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ProductFaq product={product} />
      </Card.Content>
    </Card.Root>
  );
}
