import {parseEtbToCents} from '@app/dashboard/digital-products/product-create-flow';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Input} from '@shadcn/forms/input/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {PlusIcon, Trash2Icon} from 'lucide-react';
import {useRef, useState, type RefObject} from 'react';
import {ServiceFormField} from './service-form-field';
import type {ServiceFormPackage} from '../service-form-state';

const TIERS = [
  {key: 'basic', name: 'Basic'},
  {key: 'standard', name: 'Standard'},
  {key: 'premium', name: 'Premium'},
] as const;

export const SERVICE_PACKAGES_MAX = 3;

type Slot = {item: ServiceFormPackage; sourceIndex: number} | null;
type Assignment = {slots: Slot[]; legacy: {item: ServiceFormPackage; sourceIndex: number}[]};

function blankPackage(name: string): ServiceFormPackage {
  return {name, description: '', price: '', delivery_days: '', revisions: '', features: ''};
}

function meaningful(item: ServiceFormPackage): boolean {
  return Boolean(item.id || [
    item.name, item.description, item.price, item.delivery_days, item.revisions, item.features,
  ].some(value => value.trim()));
}

/**
 * Match explicit tier names before assigning older custom-named packages by
 * position. An older service may contain up to six packages, so never discard
 * additional saved records when rendering the three new fixed slots.
 */
function assignPackages(packages: ServiceFormPackage[]): Assignment {
  const slots: Slot[] = [null, null, null];
  const used = new Set<number>();

  packages.forEach((item, sourceIndex) => {
    if (!meaningful(item)) return;
    const name = item.name.trim().toLowerCase();
    const tierIndex = name === 'basic' || name === 'starter' ? 0
      : name === 'standard' ? 1 : name === 'premium' ? 2 : -1;
    if (tierIndex >= 0 && !slots[tierIndex]) {
      slots[tierIndex] = {item, sourceIndex};
      used.add(sourceIndex);
    }
  });

  const legacy: Assignment['legacy'] = [];
  packages.forEach((item, sourceIndex) => {
    if (!meaningful(item) || used.has(sourceIndex)) return;
    const available = slots.findIndex(slot => !slot);
    if (available >= 0) {
      slots[available] = {item, sourceIndex};
    } else {
      legacy.push({item, sourceIndex});
    }
  });
  return {slots, legacy};
}

function lines(value: string): string[] {
  return value.split('\n').map(line => line.trim()).filter(Boolean);
}

function included(items: string[], name: string): boolean {
  return items.some(item => item.toLocaleLowerCase() === name.toLocaleLowerCase());
}

/**
 * Three fixed package tiers, with no custom tier-name field or Add Package
 * action. Enabled tiers are the only entries sent to the existing service API.
 * Disabled tier details survive toggles during editing, including stage changes
 * when the parent supplies draftCache; after saving an off tier is not stored.
 */
export function ServicePackagesField({
  packages,
  errors,
  onChange,
  draftCache,
}: {
  packages: ServiceFormPackage[];
  errors: Record<string, string>;
  onChange: (packages: ServiceFormPackage[]) => void;
  draftCache?: RefObject<Record<string, ServiceFormPackage>>;
}) {
  const {trans} = useTrans();
  const localCache = useRef<Record<string, ServiceFormPackage>>({});
  const cache = draftCache?.current ?? localCache.current;
  const [newFeature, setNewFeature] = useState('');
  const [featureError, setFeatureError] = useState('');
  const {slots, legacy} = assignPackages(packages);
  const enabledCount = slots.filter(Boolean).length;
  const featureLists = slots.map(slot => slot ? lines(slot.item.features) : []);
  const featureRows = Array.from(new Map(
    featureLists.flat().map(value => [value.toLocaleLowerCase(), value]),
  ).values());

  const emit = (next: Slot[], nextLegacy = legacy) => {
    onChange([
      ...next.flatMap((slot, index) => slot ? [{...slot.item, name: TIERS[index].name}] : []),
      ...nextLegacy.map(entry => entry.item),
    ]);
  };

  const setEnabled = (index: number, checked: boolean) => {
    const current = slots[index];
    const next = [...slots];
    const tier = TIERS[index];
    if (!checked) {
      if (current) cache[tier.key] = {...current.item, name: tier.name};
      next[index] = null;
    } else {
      next[index] = {
        sourceIndex: -1,
        item: {...(cache[tier.key] ?? blankPackage(tier.name)), name: tier.name},
      };
    }
    emit(next);
    setFeatureError('');
  };

  const updateTier = (index: number, patch: Partial<ServiceFormPackage>) => {
    const next = [...slots];
    const current = next[index];
    if (!current) return;
    next[index] = {
      ...current,
      item: {...current.item, ...patch, name: TIERS[index].name},
    };
    emit(next);
  };

  const toggleFeature = (index: number, name: string, checked: boolean) => {
    const slot = slots[index];
    if (!slot) return;
    const current = lines(slot.item.features);
    if (checked && !included(current, name) && current.length >= 20) {
      setFeatureError(trans({message: 'Each package can include up to 20 features.'}));
      return;
    }
    const next = checked
      ? included(current, name) ? current : [...current, name]
      : current.filter(value => value.toLocaleLowerCase() !== name.toLocaleLowerCase());
    updateTier(index, {features: next.join('\n')});
    setFeatureError('');
  };

  const addFeature = () => {
    const name = newFeature.trim();
    if (!name) return;
    if (name.length > 200) {
      setFeatureError(trans({message: 'Feature names must be 200 characters or fewer.'}));
      return;
    }
    if (included(featureRows, name)) {
      setFeatureError(trans({message: 'This feature already exists.'}));
      return;
    }
    const index = slots.findIndex((slot, slotIndex) =>
      Boolean(slot && featureLists[slotIndex].length < 20),
    );
    if (index < 0) {
      setFeatureError(trans({message: 'Enable a package with room for a feature first.'}));
      return;
    }
    toggleFeature(index, name, true);
    setNewFeature('');
  };

  const removeFeature = (name: string) => {
    const next = slots.map(slot => {
      if (!slot) return null;
      return {
        ...slot,
        item: {
          ...slot.item,
          features: lines(slot.item.features)
            .filter(value => value.toLocaleLowerCase() !== name.toLocaleLowerCase())
            .join('\n'),
        },
      };
    });
    emit(next);
    setFeatureError('');
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            <Trans message="Choose your packages" />
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            <Trans message="Turn on any of the three tiers. Only enabled packages are included when you save." />
          </p>
        </div>
        <p className="text-xs font-medium tabular-nums text-muted-foreground">
          <Trans message=":count of 3 enabled" values={{count: enabledCount}} />
        </p>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3">
        {TIERS.map((tier, index) => {
          const slot = slots[index];
          const item = slot?.item;
          const sourceIndex = slot?.sourceIndex ?? -1;
          const idPrefix = 'packages.' + sourceIndex + '.';
          const priceCents = item ? parseEtbToCents(item.price) : null;
          const tierErrors = slot
            ? Object.keys(errors).filter(key => key.startsWith('packages.' + sourceIndex + '.'))
            : [];
          return (
            <section
              key={tier.key}
              aria-label={tier.name + ' package'}
              className={cn(
                'min-w-0 overflow-hidden rounded-card-sm border bg-card',
                item ? 'border-border' : 'border-border/70',
                tierErrors.length > 0 && 'border-destructive/60',
              )}
            >
              <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{tier.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item ? <Trans message="Enabled" /> : <Trans message="Disabled" />}
                  </p>
                  {item && item.name.trim().toLowerCase() !== tier.name.toLowerCase() && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Trans message="Previously: :name" values={{name: item.name}} />
                    </p>
                  )}
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(item)}
                  onCheckedChange={checked => setEnabled(index, checked)}
                  aria-label={trans({
                    message: 'Enable :name package',
                    values: {name: tier.name},
                  })}
                />
              </div>

              {item ? (
                <div className="space-y-4 p-4">
                  <ServiceFormField
                    name={idPrefix + 'price_cents'}
                    label={trans({message: 'Price'})}
                    error={errors[idPrefix + 'price_cents']}
                    description={trans({message: 'Leave empty for a custom quote.'})}
                  >
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <InputGroupText>ETB</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id={idPrefix + 'price_cents'}
                        inputMode="decimal"
                        value={item.price}
                        onChange={event => updateTier(index, {price: event.target.value})}
                        placeholder="299"
                        aria-invalid={!!errors[idPrefix + 'price_cents']}
                      />
                    </InputGroup>
                  </ServiceFormField>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
                    <ServiceFormField
                      name={idPrefix + 'delivery_days'}
                      label={trans({message: 'Delivery days'})}
                      error={errors[idPrefix + 'delivery_days']}
                    >
                      <Input
                        id={idPrefix + 'delivery_days'}
                        inputMode="numeric"
                        value={item.delivery_days}
                        onChange={event => updateTier(index, {delivery_days: event.target.value})}
                        placeholder="5"
                        aria-invalid={!!errors[idPrefix + 'delivery_days']}
                      />
                    </ServiceFormField>
                    <ServiceFormField
                      name={idPrefix + 'revisions'}
                      label={trans({message: 'Revisions'})}
                      error={errors[idPrefix + 'revisions']}
                    >
                      <Input
                        id={idPrefix + 'revisions'}
                        inputMode="numeric"
                        value={item.revisions}
                        onChange={event => updateTier(index, {revisions: event.target.value})}
                        placeholder="2"
                        aria-invalid={!!errors[idPrefix + 'revisions']}
                      />
                    </ServiceFormField>
                  </div>

                  <ServiceFormField
                    name={idPrefix + 'description'}
                    label={trans({message: 'Package description'})}
                    error={errors[idPrefix + 'description']}
                    counter={{current: item.description.length, max: 3000}}
                  >
                    <Textarea
                      id={idPrefix + 'description'}
                      rows={3}
                      maxLength={3000}
                      value={item.description}
                      onChange={event => updateTier(index, {description: event.target.value})}
                      placeholder={trans({message: 'What the customer receives'})}
                      aria-invalid={!!errors[idPrefix + 'description']}
                    />
                  </ServiceFormField>

                  <p className="text-sm font-medium tabular-nums">
                    {priceCents === null
                      ? <Trans message="Quote only" />
                      : formatMoney(priceCents, 'ETB')}
                  </p>
                  {errors[idPrefix + 'name'] && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors[idPrefix + 'name']}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex min-h-28 items-center p-4 text-sm leading-5 text-muted-foreground">
                  <Trans message="Enable this tier to set pricing, delivery and revisions." />
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section aria-label={trans({message: 'Included features'})} className="min-w-0 rounded-card-sm border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4">
          <div>
            <h3 className="text-sm font-semibold"><Trans message="Included features" /></h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              <Trans message="Add each deliverable once, then choose which tiers include it." />
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            <Trans message=":count features" values={{count: featureRows.length}} />
          </span>
        </div>

        {featureRows.length ? (
          <div className="min-w-0 px-3 py-3 sm:px-4">
            <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-xs font-medium text-muted-foreground">
                  <th scope="col" className="w-2/5 border-b px-2 py-2 text-start">
                    <Trans message="Feature" />
                  </th>
                  {TIERS.map(tier => (
                    <th key={tier.key} scope="col" className="w-1/5 border-b px-1 py-2 text-center">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map(feature => (
                  <tr key={feature.toLocaleLowerCase()} className="group/feature">
                    <th scope="row" className="break-words border-b px-2 py-3 text-start font-normal">
                      <span>{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="ms-1 align-middle"
                        aria-label={trans({
                          message: 'Remove feature :name',
                          values: {name: feature},
                        })}
                        onClick={() => removeFeature(feature)}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </th>
                    {TIERS.map((tier, index) => {
                      const slot = slots[index];
                      const checked = included(featureLists[index], feature);
                      return (
                        <td key={tier.key} className="border-b px-1 py-3 text-center">
                          <Checkbox
                            bindToHookForm={false}
                            checked={checked}
                            disabled={!slot}
                            onCheckedChange={next => toggleFeature(index, feature, next === true)}
                            aria-label={trans({
                              message: 'Include :feature in :tier',
                              values: {feature, tier: tier.name},
                            })}
                            className="mx-auto"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            <Trans message="No features yet. Add a deliverable to compare across tiers." />
          </p>
        )}

        <div className="border-t px-4 py-4">
          <label htmlFor="service-new-package-feature" className="mb-2 block text-sm font-medium">
            <Trans message="Add an included feature" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="service-new-package-feature"
              className="min-w-0 flex-1"
              value={newFeature}
              maxLength={200}
              disabled={!enabledCount}
              onChange={event => {
                setNewFeature(event.target.value);
                setFeatureError('');
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addFeature();
                }
              }}
              placeholder={trans({message: 'e.g. Source files'})}
              aria-invalid={!!featureError}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!enabledCount || !newFeature.trim()}
              onClick={addFeature}
            >
              <PlusIcon data-icon="inline-start" />
              <Trans message="Add feature" />
            </Button>
          </div>
          {featureError && <p className="mt-2 text-sm text-destructive" role="alert">{featureError}</p>}
          {!enabledCount && (
            <p className="mt-2 text-xs text-muted-foreground">
              <Trans message="Enable at least one package to add included features." />
            </p>
          )}
          {slots.map((slot, index) => {
            if (!slot) return null;
            const fieldId = 'packages.' + slot.sourceIndex + '.features';
            const error = errors[fieldId];
            return (
              <div key={TIERS[index].key} id={fieldId} tabIndex={-1}
                className="mt-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">
                {error && <p className="text-destructive" role="alert">
                  {TIERS[index].name}: {error}
                </p>}
              </div>
            );
          })}
        </div>
      </section>

      {legacy.length > 0 && (
        <section className="rounded-card-sm border border-warning/40 p-4" aria-label={trans({message: 'Older packages'})}>
          <h3 className="text-sm font-semibold"><Trans message="Older packages" /></h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            <Trans message="This service has additional packages from the previous editor. They remain saved until you remove them explicitly." />
          </p>
          <ul className="mt-3 divide-y">
            {legacy.map(entry => (
              <li key={entry.item.id ?? entry.sourceIndex} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-sm">{entry.item.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => emit(slots, legacy.filter(item => item.sourceIndex !== entry.sourceIndex))}
                  aria-label={trans({message: 'Remove older package :name', values: {name: entry.item.name}})}
                >
                  <Trash2Icon data-icon="inline-start" />
                  <Trans message="Remove" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
