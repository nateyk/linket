import {biolinkSurfaceCard, biolinkSurfaceContent} from '@app/digital-products/public/product-page/surface';
import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {resolveBiolinkButtonAppearance, resolveBiolinkSegmentedTabsAppearance} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Separator} from '@shadcn/separator';
import {Tabs} from '@shadcn/tabs/tabs';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  CheckIcon,
  ClockIcon,
  InfoIcon,
  PackageIcon,
  RefreshCwIcon,
  type LucideIcon,
} from 'lucide-react';
import type {PublicServicePackage} from './service-types';

/**
 * The offer rail. It mirrors the product page's pricing card so the two shop
 * pages read as one shop: price first, one full-width action directly under
 * it, then what the tier includes. Every action wears the store's own button
 * appearance.
 */
export function ServicePackagePanel({
  packages,
  appearance,
  onRequest,
  onSelect,
}: {
  packages: PublicServicePackage[];
  appearance?: BiolinkAppearanceConfig | null;
  onRequest: (packageId?: number) => void;
  /** Keep the mobile sticky quote action in sync with the visible tier. */
  onSelect?: (packageId: number) => void;
}) {
  const {trans} = useTrans();
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  // The storefront's own segmented control — appearance track, radius and
  // active pill with the offset shadow — so the tier switcher is not
  // dashboard chrome pasted onto the shop.
  const segmented = resolveBiolinkSegmentedTabsAppearance(appearance);

  if (!packages.length) {
    return (
      <Card.Root className={biolinkSurfaceCard}>
        <Card.Content className={biolinkSurfaceContent}>
          <p className="text-4xl leading-none font-semibold tracking-tight">
            <Trans message="Request a quote" />
          </p>
          <p className="text-base text-[var(--biolink-muted-text)]">
            <Trans message="Tell the creator what you need and they will send you a quote." />
          </p>
          <Button
            variant="ghost"
            className={cn('w-full', buttonAppearance.className)}
            style={buttonAppearance.style}
            size="lg"
            onClick={() => onRequest()}
          >
            <Trans message="Send inquiry" />
          </Button>
        </Card.Content>
      </Card.Root>
    );
  }

  if (packages.length === 1) {
    return (
      <PackageCard
        packageItem={packages[0]}
        buttonAppearance={buttonAppearance}
        onRequest={() => onRequest(packages[0].id)}
      />
    );
  }

  return (
    <Tabs.Root
      defaultValue={String(packages[0].id)}
      className="min-w-0 gap-3"
      onValueChange={value => onSelect?.(Number(value))}
    >
      {/* Let each label take its own capped width. flex-1 squeezes long
          translated labels into overlapping tabs even when the outer page
          reports no horizontal overflow. Keep extra width in this scrollport. */}
      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain px-1 pt-1 pb-3 scrollbar-none">
        <Tabs.List
          aria-label={trans({message: 'Packages'})}
          style={segmented.style}
          indicatorClass={segmented.indicatorClassName}
          className={cn(segmented.listClassName, 'w-max min-w-full max-w-none')}
        >
          {packages.map(packageItem => (
            <Tabs.Tab
              key={packageItem.id}
              value={String(packageItem.id)}
              className={cn(
                segmented.tabClassName,
                'w-max min-w-28 max-w-56 whitespace-normal text-center leading-snug break-words [overflow-wrap:anywhere]',
              )}
            >
              <span className="min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">
                {packageItem.name}
              </span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>
      {packages.map(packageItem => (
        <Tabs.Panel key={packageItem.id} value={String(packageItem.id)}>
          <PackageCard
            packageItem={packageItem}
            buttonAppearance={buttonAppearance}
            onRequest={() => onRequest(packageItem.id)}
          />
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

function PackageCard({
  packageItem,
  buttonAppearance,
  onRequest,
}: {
  packageItem: PublicServicePackage;
  buttonAppearance: ReturnType<typeof resolveBiolinkButtonAppearance>;
  onRequest: () => void;
}) {
  return (
    <Card.Root className={biolinkSurfaceCard}>
      <Card.Content className={biolinkSurfaceContent}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-sm font-medium text-[var(--biolink-muted-text)] break-words [overflow-wrap:anywhere]">
              {packageItem.name}
            </h2>
            <p className="min-w-0 text-3xl leading-tight font-semibold tracking-tight tabular-nums break-words [overflow-wrap:anywhere] sm:text-4xl">
              {packageItem.price_cents === null ? (
                <Trans message="Quote only" />
              ) : (
                formatMoney(packageItem.price_cents, packageItem.currency)
              )}
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-card-sm bg-[var(--biolink-surface)] text-[var(--biolink-muted-text)] ring-1 ring-(color:--biolink-border)">
            <PackageIcon className="size-5" aria-hidden="true" />
          </span>
        </div>

        {/* The action sits directly under the price, the same place the
            product page puts its buy button. */}
        <Button
          variant="ghost"
          className={cn('w-full', buttonAppearance.className)}
          style={buttonAppearance.style}
          size="lg"
          onClick={onRequest}
        >
          <Trans message="Request this package" />
        </Button>

        {packageItem.description && (
          <p className="text-base leading-6 text-[var(--biolink-muted-text)] break-words [overflow-wrap:anywhere]">
            {packageItem.description}
          </p>
        )}

        {(packageItem.delivery_days !== null ||
          packageItem.revisions !== null) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--biolink-muted-text)]">
            {packageItem.delivery_days !== null && (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
                <Trans
                  message=":count days delivery"
                  values={{count: packageItem.delivery_days}}
                />
              </span>
            )}
            {packageItem.revisions !== null && (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCwIcon
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
                <Trans
                  message=":count revisions"
                  values={{count: packageItem.revisions}}
                />
              </span>
            )}
          </div>
        )}

        {!!packageItem.features.length && (
          <>
            <Separator className="bg-[var(--biolink-border)]" />
            <ul className="flex flex-col gap-3 text-base text-[var(--biolink-muted-text)]">
              {packageItem.features.map((feature, index) => (
                <IncludeItem key={index} icon={CheckIcon}>
                  {feature}
                </IncludeItem>
              ))}
            </ul>
          </>
        )}

        <div className="flex items-start gap-2 rounded-card bg-[var(--biolink-surface)] p-3 text-sm text-[var(--biolink-muted-text)]">
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <Trans message="You agree the details and payment directly with the creator." />
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function IncludeItem({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-card-xs bg-[var(--biolink-surface)] text-[var(--biolink-muted-text)] ring-1 ring-(color:--biolink-border)">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 pt-1 leading-5 break-words [overflow-wrap:anywhere]">{children}</span>
    </li>
  );
}