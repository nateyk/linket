import {Input} from '@shadcn/forms/input/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {PlusIcon, SparklesIcon, Trash2Icon} from 'lucide-react';
import {ServiceFormField} from './service-form-field';
import type {ServiceFormPackage} from '../service-form-state';

const PACKAGE_PRESETS = [
  message('Starter'),
  message('Standard'),
  message('Premium'),
] as const;

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
 * Package repeater. Only rows with a name are saved, so a half-typed row can
 * never reach the API — the section says so instead of validating silently.
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

  const update = (index: number, patch: Partial<ServiceFormPackage>) => {
    onChange(
      packages.map((item, itemIndex) =>
        itemIndex === index ? {...item, ...patch} : item,
      ),
    );
  };

  const remove = (index: number) => {
    onChange(packages.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="flex flex-col gap-4">
      {packages.map((item, index) => {
        const featureCount = countFeatures(item.features);

        return (
          <div
            key={item.id ?? `new-${index}`}
            className={cn(
              'flex flex-col gap-4',
              // A hairline rule, not a second box: the section is already a
              // bordered group, and stacked rings flatten the hierarchy.
              index > 0 && 'mt-4 border-t border-border pt-5',
            )}
          >
            {packages.length > 1 && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  <Trans
                    message="Package :number"
                    values={{number: index + 1}}
                  />
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={trans({message: 'Remove package'})}
                  onClick={() => remove(index)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            )}

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
                    aria-invalid={!!errors[`packages.${index}.price_cents`]}
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
                  aria-invalid={!!errors[`packages.${index}.delivery_days`]}
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
              counter={{current: item.description.length, max: 300}}
              error={errors[`packages.${index}.description`]}
            >
              <Textarea
                id={`packages.${index}.description`}
                rows={2}
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

            {!item.name.trim() && (
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
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...packages, blankPackage()])}
      >
        <PlusIcon data-icon="inline-start" />
        <Trans message="Add package" />
      </Button>

      <p className="text-xs leading-5 text-muted-foreground">
        <Trans message="Only packages with a name are published. Leave the price empty for quote-only packages." />
      </p>
    </div>
  );
}