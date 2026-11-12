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
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {PlusIcon, Trash2Icon} from 'lucide-react';
import {useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {ServiceFormField} from './service-form-field';
import type {ServiceFormPackage} from '../service-form-state';

const TIERS = [
  {key: 'basic', name: 'Basic', label: message('Basic'), shortLabel: message('Basic')},
  {key: 'standard', name: 'Standard', label: message('Standard'), shortLabel: message('Std.')},
  {key: 'premium', name: 'Premium', label: message('Premium'), shortLabel: message('Prem.')},
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
    if (!meaningful(item) || item.legacy) return;
    const name = item.name.trim().toLowerCase();
    const tierIndex = name === 'basic' || name === 'starter' ? 0
      : name === 'standard' ? 1 : name === 'premium' ? 2 : -1;
    if (tierIndex >= 0 && !slots[tierIndex]) {
      slots[tierIndex] = {item, sourceIndex};
      used.add(sourceIndex);
    }
  });

  const legacy: Assignment['legacy'] = [];
  // An unmatched older package is never allowed to occupy a deliberately
  // disabled tier. Only all-custom legacy services use positional migration.
  const canAssignCustomByPosition = used.size === 0;
  packages.forEach((item, sourceIndex) => {
    if (!meaningful(item) || used.has(sourceIndex)) return;
    const available = slots.findIndex(slot => !slot);
    if (!item.legacy && canAssignCustomByPosition && available >= 0) {
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [descriptionOpen, setDescriptionOpen] = useState<number | null>(null);
  const {slots, legacy} = assignPackages(packages);
  const enabledCount = slots.filter(Boolean).length;
  const featureLists = slots.map(slot => slot ? lines(slot.item.features) : []);
  const featureRows = Array.from(new Map(
    featureLists.flat().map(value => [value.toLocaleLowerCase(), value]),
  ).values());

  const firstErrorIndex = slots.findIndex(slot =>
    Boolean(slot && Object.keys(errors).some(key =>
      key.startsWith('packages.' + slot.sourceIndex + '.'),
    )),
  );
  const errorSignature = Object.keys(errors).sort().join('|');
  useLayoutEffect(() => {
    if (firstErrorIndex >= 0) setSelectedIndex(firstErrorIndex);
  }, [firstErrorIndex, errorSignature]);

  const selectedTier = TIERS[selectedIndex];
  const selectedSlot = slots[selectedIndex];
  const selectedItem = selectedSlot?.item;
  const selectedField = 'packages.' + (selectedSlot?.sourceIndex ?? -1) + '.';
  const selectedDescriptionVisible = Boolean(
    selectedItem && (
      selectedItem.description.trim() ||
      descriptionOpen === selectedIndex ||
      errors[selectedField + 'description']
    ),
  );

  const emit = (next: Slot[], nextLegacy = legacy) => {
    onChange([
      ...next.flatMap((slot, index) => slot ? [{...slot.item, name: TIERS[index].name}] : []),
      ...nextLegacy.map(entry => ({...entry.item, legacy: true as const})),
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
    if (checked) setSelectedIndex(index);
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
    const index = slots[selectedIndex] && featureLists[selectedIndex].length < 20
      ? selectedIndex
      : slots.findIndex((slot, slotIndex) =>
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
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <Trans message="Enable only the packages you offer. Leave them off to invite quotes." />
        </p>
        <p className="text-xs font-medium tabular-nums text-muted-foreground">
          <Trans message=":count of 3 enabled" values={{count: enabledCount}} />
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-3 gap-1 rounded-card-sm bg-muted/40 p-1 sm:gap-2" role="group" aria-label={trans({message: 'Package tiers'})}>
        {TIERS.map((tier, index) => {
          const slot = slots[index];
          const tierName = trans(tier.label);
          const item = slot?.item;
          const priceCents = item ? parseEtbToCents(item.price) : null;
          const tierHasError = Boolean(slot && Object.keys(errors).some(
            key => key.startsWith('packages.' + slot.sourceIndex + '.'),
          ));
          return (
            <section
              key={tier.key}
              aria-label={tier.name + ' package'}
              className={cn(
                'min-w-0 rounded-card-xs px-1.5 py-2.5 transition-colors motion-reduce:transition-none sm:px-3',
                selectedIndex === index && 'bg-card ring-1 ring-primary/60',
                tierHasError && 'ring-1 ring-destructive',
              )}
            >
              <button
                type="button"
                aria-pressed={selectedIndex === index}
                aria-label={trans({message: 'Edit :name package', values: {name: tierName}})}
                onClick={() => setSelectedIndex(index)}
                className="flex min-h-12 w-full min-w-0 flex-col justify-start gap-1 rounded-card-xs text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className={cn('text-sm font-semibold', selectedIndex === index ? 'text-primary' : !item ? 'text-muted-foreground' : 'text-foreground')}>
                  {tierName}
                </span>
                <span className="min-w-0 break-words text-xs leading-4 text-muted-foreground tabular-nums">
                  {!item ? <Trans message="Not offered" /> :
                    priceCents === null ? <Trans message="Quote only" /> :
                    formatMoney(priceCents, 'ETB')}
                </span>
              </button>
              <div className="mt-2 flex min-h-11 items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground">
                  {item ? <Trans message="On" /> : <Trans message="Off" />}
                </span>
                <Switch
                  size="default"
                  checked={Boolean(item)}
                  onCheckedChange={checked => setEnabled(index, checked)}
                  aria-label={trans({message: 'Enable :name package', values: {name: tierName}})}
                />
              </div>
            </section>
          );
        })}
      </div>

      <section
        aria-label={trans({message: ':name package details', values: {name: trans(selectedTier.label)}})}
        className="min-w-0 space-y-4"
      >
        <header className="flex items-center justify-between gap-3 border-b pb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              <Trans message=":name details" values={{name: trans(selectedTier.label)}} />
            </h3>
            {selectedItem && selectedItem.name.trim().toLowerCase() !== selectedTier.name.toLowerCase() && (
              <p className="mt-1 text-xs text-muted-foreground">
                <Trans message="Previously: :name" values={{name: selectedItem.name}} />
              </p>
            )}
          </div>
          {selectedItem && (
            <p className="shrink-0 text-xs font-medium text-muted-foreground">
              <Trans message="Editing" />
            </p>
          )}
        </header>
        {selectedItem ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ServiceFormField
                name={selectedField + 'price_cents'}
                label={trans({message: 'Price'})}
                error={errors[selectedField + 'price_cents']}
                description={trans({message: 'Leave blank for a quote.'})}
              >
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText>ETB</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id={selectedField + 'price_cents'}
                    inputMode="decimal"
                    value={selectedItem.price}
                    onChange={event => updateTier(selectedIndex, {price: event.target.value})}
                    placeholder={trans({message: 'Amount'})}
                    aria-invalid={!!errors[selectedField + 'price_cents']}
                  />
                </InputGroup>
              </ServiceFormField>
              <div className="grid grid-cols-2 gap-3">
                <ServiceFormField
                  name={selectedField + 'delivery_days'}
                  label={trans({message: 'Delivery days'})}
                  error={errors[selectedField + 'delivery_days']}
                >
                  <Input
                    id={selectedField + 'delivery_days'}
                    inputMode="numeric"
                    value={selectedItem.delivery_days}
                    onChange={event => updateTier(selectedIndex, {delivery_days: event.target.value})}
                    placeholder="5"
                    aria-invalid={!!errors[selectedField + 'delivery_days']}
                  />
                </ServiceFormField>
                <ServiceFormField
                  name={selectedField + 'revisions'}
                  label={trans({message: 'Revisions'})}
                  error={errors[selectedField + 'revisions']}
                >
                  <Input
                    id={selectedField + 'revisions'}
                    inputMode="numeric"
                    value={selectedItem.revisions}
                    onChange={event => updateTier(selectedIndex, {revisions: event.target.value})}
                    placeholder="2"
                    aria-invalid={!!errors[selectedField + 'revisions']}
                  />
                </ServiceFormField>
              </div>
            </div>
            {selectedDescriptionVisible ? (
              <ServiceFormField
                name={selectedField + 'description'}
                label={trans({message: 'Package description'})}
                error={errors[selectedField + 'description']}
                counter={{current: selectedItem.description.length, max: 3000}}
              >
                <Textarea
                  id={selectedField + 'description'}
                  rows={3}
                  maxLength={3000}
                  value={selectedItem.description}
                  onChange={event => updateTier(selectedIndex, {description: event.target.value})}
                  placeholder={trans({message: 'What the customer receives'})}
                  aria-invalid={!!errors[selectedField + 'description']}
                />
              </ServiceFormField>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-0"
                onClick={() => setDescriptionOpen(selectedIndex)}
              >
                <PlusIcon data-icon="inline-start" />
                <Trans message="Add package description" />
              </Button>
            )}
            {errors[selectedField + 'name'] && (
              <p id={selectedField + 'name'} tabIndex={-1} role="alert" className="text-sm text-destructive">
                {errors[selectedField + 'name']}
              </p>
            )}
          </div>
        ) : (
          <p className="py-1 text-sm text-muted-foreground">
            <Trans message="Turn on this package to add its price and delivery details." />
          </p>
        )}
      </section>

      <section aria-label={trans({message: 'Included features'})} className="min-w-0 border-t pt-5">
        <div className="flex items-center justify-between gap-3 pb-4">
          <div>
            <h3 className="text-sm font-semibold"><Trans message="Included features" /></h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              <Trans message="Select which packages include each feature." />
            </p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {featureRows.length === 1
              ? <Trans message="1 feature" />
              : <Trans message=":count features" values={{count: featureRows.length}} />}
          </span>
        </div>

        {featureRows.length > 0 && (
          <div className="divide-y">
            {featureRows.map(feature => (
              <div key={feature.toLocaleLowerCase()} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,1fr)] sm:items-center">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 break-words text-sm">{feature}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label={trans({message: 'Remove feature :name', values: {name: feature}})}
                    onClick={() => removeFeature(feature)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1" role="group" aria-label={trans({message: 'Packages including :feature', values: {feature}})}>
                  {TIERS.map((tier, index) => (
                    <label
                      key={tier.key}
                      className={cn(
                        'flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-button px-1 py-1.5 text-xs hover:bg-muted/60 sm:flex-row sm:gap-2',
                        !slots[index] && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <Checkbox
                        bindToHookForm={false}
                        checked={included(featureLists[index], feature)}
                        disabled={!slots[index]}
                        onCheckedChange={next => toggleFeature(index, feature, next === true)}
                        aria-label={trans({message: 'Include :feature in :tier', values: {feature, tier: trans(tier.label)}})}
                      />
                      <span className="text-xs text-muted-foreground" aria-hidden="true">
                        {trans(tier.shortLabel)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={cn('pt-4', featureRows.length > 0 && 'border-t')}>
          <label htmlFor="service-new-package-feature" className="mb-2 block text-sm font-medium">
            <Trans message="Add an included feature" />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="service-new-package-feature"
              className="min-w-0 w-full sm:flex-1"
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
              className="w-full sm:w-auto"
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
                  {trans(TIERS[index].label)}: {error}
                </p>}
              </div>
            );
          })}
        </div>
      </section>

      {legacy.length > 0 && (
        <section className="border-t pt-5" aria-label={trans({message: 'Older packages'})}>
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
