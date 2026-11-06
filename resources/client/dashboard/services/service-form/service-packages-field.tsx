import {parseEtbToCents} from '@app/dashboard/digital-products/product-create-flow';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {formatMoney} from '@ui/i18n/format-money';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  ChevronDownIcon,
  PackageIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react';
import {useState} from 'react';
import {ServiceFormField} from './service-form-field';
import type {ServiceFormPackage} from '../service-form-state';

const PACKAGE_PRESETS = [
  message('Starter'),
  message('Standard'),
  message('Premium'),
] as const;

export const SERVICE_PACKAGES_MAX = 6;

function blankPackage(): ServiceFormPackage {
  return {
    name: '',
    description: '',
    price: '',
    delivery_days: '',
    revisions: '',
    features: '',
  };
}

function countFeatures(value: string): number {
  return value.split('\n').filter(line => line.trim()).length;
}

/**
 * Packages as a list you scan, not a wall of fields. Each row summarises what
 * the package is — name, price, delivery, revisions, feature count — and opens
 * one editor at a time. An invalid row opens itself so its error is never
 * hidden behind a collapsed disclosure.
 */
export function ServicePackagesField({
  packages,
  errors,
  onChange,
}: {
  packages: ServiceFormPackage[];
  errors: Record<string, string>;
  onChange: (packages: ServiceFormPackage[]) => void;
}) {
  const {trans} = useTrans();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const atLimit = packages.length >= SERVICE_PACKAGES_MAX;

  const firstErrorIndex = packages.findIndex((_item, index) =>
    Object.keys(errors).some(key => key.startsWith(`packages.${index}.`)),
  );

  // Explicit choice wins; otherwise a row with an error opens by default.
  const activeIndex = openIndex ?? (firstErrorIndex >= 0 ? firstErrorIndex : null);

  const add = (name = '') => {
    if (packages.length >= SERVICE_PACKAGES_MAX) return;
    onChange([...packages, {...blankPackage(), name}]);
    setOpenIndex(packages.length);
  };

  const update = (index: number, patch: Partial<ServiceFormPackage>) => {
    onChange(
      packages.map((item, itemIndex) =>
        itemIndex === index ? {...item, ...patch} : item,
      ),
    );
  };

  const remove = (index: number) => {
    onChange(packages.filter((_, itemIndex) => itemIndex !== index));
    setOpenIndex(null);
  };

  if (!packages.length) {
    return (
      <div className="flex flex-col gap-3">
        <Empty.Root className="rounded-card border border-dashed py-7">
          <Empty.Header>
            <Empty.Media variant="icon">
              <PackageIcon />
            </Empty.Media>
            <Empty.Title>
              <Trans message="No packages yet" />
            </Empty.Title>
            <Empty.Description>
              <Trans message="Give customers two or three clear options to choose from." />
            </Empty.Description>
          </Empty.Header>
          <Empty.Content className="flex flex-row flex-wrap justify-center gap-2">
            {PACKAGE_PRESETS.map(preset => (
              <Button
                key={preset.message}
                type="button"
                variant="outline"
                size="sm"
                aria-label={trans({
                  message: 'Add :name package',
                  values: {name: preset.message},
                })}
                onClick={() => add(preset.message)}
              >
                <PlusIcon data-icon="inline-start" />
                <Trans message={preset.message} />
              </Button>
            ))}
          </Empty.Content>
        </Empty.Root>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => add()}
        >
          <PlusIcon data-icon="inline-start" />
          <Trans message="Add package" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {packages.map((item, index) => {
        const isOpen = activeIndex === index;
        const panelId = `package-panel-${index}`;
        const priceCents = parseEtbToCents(item.price);
        const featureCount = countFeatures(item.features);
        const delivery = item.delivery_days.trim();
        const revisions = item.revisions.trim();
        const displayName = item.name.trim();

        return (
          <div
            key={item.id ?? `new-${index}`}
            className="rounded-card-sm border border-border"
          >
            <div className="flex items-center gap-1.5 p-2 ps-3">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={trans({
                  message: 'Edit package :name',
                  values: {
                    name:
                      displayName || trans({message: 'Untitled package'}),
                  },
                })}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-button py-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-card-sm bg-muted text-xs font-medium tabular-nums text-muted-foreground">
                  {index + 1}
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      !displayName && 'text-muted-foreground',
                    )}
                  >
                    {displayName || <Trans message="Untitled package" />}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {priceCents === null ? (
                        <Trans message="Quote only" />
                      ) : (
                        formatMoney(priceCents, 'ETB')
                      )}
                    </span>
                    {delivery && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          <Trans
                            message=":count days"
                            values={{count: delivery}}
                          />
                        </span>
                      </>
                    )}
                    {revisions && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          <Trans
                            message=":count revisions"
                            values={{count: revisions}}
                          />
                        </span>
                      </>
                    )}
                    {!!featureCount && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          <Trans
                            message=":count features"
                            values={{count: featureCount}}
                          />
                        </span>
                      </>
                    )}
                  </span>
                </span>

                {/* The arrow sits inside the trigger: it is the affordance
                    people aim for, so it must open the row too. */}
                <ChevronDownIcon
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={trans({
                  message: 'Remove package :name',
                  values: {
                    name:
                      displayName || trans({message: 'Untitled package'}),
                  },
                })}
                onClick={() => remove(index)}
              >
                <Trash2Icon />
              </Button>
            </div>

            {isOpen && (
              <div
                id={panelId}
                className="flex flex-col gap-4 border-t border-border p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                  <ServiceFormField
                    name={`packages.${index}.name`}
                    label={trans({message: 'Package name'})}
                    required
                    error={errors[`packages.${index}.name`]}
                  >
                    <Input
                      id={`packages.${index}.name`}
                      value={item.name}
                      maxLength={80}
                      onChange={event =>
                        update(index, {name: event.target.value})
                      }
                      placeholder={trans({message: 'Starter'})}
                      aria-invalid={!!errors[`packages.${index}.name`]}
                    />
                  </ServiceFormField>

                  <ServiceFormField
                    name={`packages.${index}.price_cents`}
                    label={trans({message: 'Price'})}
                    error={errors[`packages.${index}.price_cents`]}
                  >
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <InputGroupText>ETB</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id={`packages.${index}.price_cents`}
                        inputMode="decimal"
                        value={item.price}
                        onChange={event =>
                          update(index, {price: event.target.value})
                        }
                        placeholder="299"
                        aria-invalid={
                          !!errors[`packages.${index}.price_cents`]
                        }
                      />
                    </InputGroup>
                  </ServiceFormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ServiceFormField
                    name={`packages.${index}.delivery_days`}
                    label={trans({message: 'Delivery days'})}
                    error={errors[`packages.${index}.delivery_days`]}
                  >
                    <Input
                      id={`packages.${index}.delivery_days`}
                      inputMode="numeric"
                      value={item.delivery_days}
                      onChange={event =>
                        update(index, {delivery_days: event.target.value})
                      }
                      placeholder="5"
                      aria-invalid={
                        !!errors[`packages.${index}.delivery_days`]
                      }
                    />
                  </ServiceFormField>

                  <ServiceFormField
                    name={`packages.${index}.revisions`}
                    label={trans({message: 'Revisions'})}
                    error={errors[`packages.${index}.revisions`]}
                  >
                    <Input
                      id={`packages.${index}.revisions`}
                      inputMode="numeric"
                      value={item.revisions}
                      onChange={event =>
                        update(index, {revisions: event.target.value})
                      }
                      placeholder="2"
                      aria-invalid={!!errors[`packages.${index}.revisions`]}
                    />
                  </ServiceFormField>
                </div>

                <ServiceFormField
                  name={`packages.${index}.description`}
                  label={trans({message: 'Package description'})}
                  counter={{current: item.description.length, max: 3000}}
                  error={errors[`packages.${index}.description`]}
                >
                  <Textarea
                    id={`packages.${index}.description`}
                    rows={2}
                    maxLength={3000}
                    value={item.description}
                    onChange={event =>
                      update(index, {description: event.target.value})
                    }
                    placeholder={trans({
                      message: 'Essential branding for a new business.',
                    })}
                    aria-invalid={!!errors[`packages.${index}.description`]}
                  />
                </ServiceFormField>

                <ServiceFormField
                  name={`packages.${index}.features`}
                  label={trans({message: "What's included"})}
                  description={trans({message: 'One item per line'})}
                  counter={
                    featureCount
                      ? {current: featureCount, max: 20}
                      : undefined
                  }
                  error={errors[`packages.${index}.features`]}
                >
                  <Textarea
                    id={`packages.${index}.features`}
                    rows={4}
                    value={item.features}
                    onChange={event =>
                      update(index, {features: event.target.value})
                    }
                    placeholder={trans({
                      message: 'One logo concept\nPNG and vector files',
                    })}
                    aria-invalid={!!errors[`packages.${index}.features`]}
                  />
                </ServiceFormField>

                {!displayName && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <SparklesIcon className="size-3.5" />
                      <Trans message="Quick names" />
                    </span>
                    {PACKAGE_PRESETS.map(preset => (
                      <Button
                        key={preset.message}
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => update(index, {name: preset.message})}
                      >
                        <Trans message={preset.message} />
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={atLimit}
        onClick={() => add()}
      >
        <PlusIcon data-icon="inline-start" />
        <Trans message="Add package" />
      </Button>
      {atLimit && (
        <p className="text-xs leading-5 text-muted-foreground">
          <Trans
            message="Maximum :count packages reached."
            values={{count: SERVICE_PACKAGES_MAX}}
          />
        </p>
      )}
    </div>
  );
}