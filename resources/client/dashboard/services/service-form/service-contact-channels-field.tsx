import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {PlusIcon, Trash2Icon} from 'lucide-react';
import {contactChannelHref} from '@app/services/public/service-contact-links';
import {ServiceFormField} from './service-form-field';
import type {
  ServiceContactChannelType,
  ServiceFormContactChannel,
} from '../service-form-state';

const CHANNEL_TYPES: {value: ServiceContactChannelType; label: ReturnType<typeof message>}[] = [
  {value: 'whatsapp', label: message('WhatsApp')},
  {value: 'telegram', label: message('Telegram')},
  {value: 'email', label: message('Email')},
  {value: 'phone', label: message('Phone')},
  {value: 'link', label: message('Website')},
];

/**
 * Contact-button repeater. Each row shows the link it will produce while the
 * creator types, so a mistyped Telegram handle or phone number is visible
 * before it reaches a visitor.
 */
export function ServiceContactChannelsField({
  channels,
  errors,
  onChange,
}: {
  channels: ServiceFormContactChannel[];
  errors: Record<string, string>;
  onChange: (channels: ServiceFormContactChannel[]) => void;
}) {
  const {trans} = useTrans();

  const update = (
    index: number,
    patch: Partial<ServiceFormContactChannel>,
  ) => {
    onChange(
      channels.map((item, itemIndex) =>
        itemIndex === index ? {...item, ...patch} : item,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {channels.map((channel, index) => {
        const href = contactChannelHref(channel);
        const typeLabel = CHANNEL_TYPES.find(
          item => item.value === channel.type,
        );

        return (
          <div
            key={index}
            className={cn(
              'flex flex-col gap-4',
              index > 0 && 'mt-4 border-t border-border pt-5',
            )}
          >
            <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end">
              <ServiceFormField
                name={`contact_channels.${index}.type`}
                label={trans({message: 'Type'})}
                error={errors[`contact_channels.${index}.type`]}
              >
                <Select.Root
                  value={channel.type}
                  onValueChange={value =>
                    update(index, {
                      type: value as ServiceContactChannelType,
                    })
                  }
                >
                  <Select.Trigger
                    id={`contact_channels.${index}.type`}
                    className="w-full"
                  >
                    <Select.Value>
                      {typeLabel ? trans(typeLabel.label) : channel.type}
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Content>
                    {CHANNEL_TYPES.map(item => (
                      <Select.Item key={item.value} value={item.value}>
                        {trans(item.label)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </ServiceFormField>

              <ServiceFormField
                name={`contact_channels.${index}.label`}
                label={trans({message: 'Button label'})}
                error={errors[`contact_channels.${index}.label`]}
              >
                <Input
                  id={`contact_channels.${index}.label`}
                  value={channel.label}
                  maxLength={60}
                  onChange={event =>
                    update(index, {label: event.target.value})
                  }
                  placeholder={trans({message: 'Chat on WhatsApp'})}
                />
              </ServiceFormField>

              <ServiceFormField
                name={`contact_channels.${index}.value`}
                label={trans({message: 'Value'})}
                error={errors[`contact_channels.${index}.value`]}
              >
                <Input
                  id={`contact_channels.${index}.value`}
                  value={channel.value}
                  maxLength={300}
                  onChange={event =>
                    update(index, {value: event.target.value})
                  }
                  placeholder={trans({message: '+251911234567'})}
                  aria-invalid={!!errors[`contact_channels.${index}.value`]}
                />
              </ServiceFormField>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="sm:mb-1"
                aria-label={trans({message: 'Remove contact button'})}
                onClick={() =>
                  onChange(
                    channels.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2Icon />
              </Button>
            </div>

            {channel.value.trim() && (
              <p className="truncate text-xs text-muted-foreground">
                {href ? (
                  <>
                    <Trans message="Opens" />
                    {` ${href}`}
                  </>
                ) : (
                  <Trans message="This value will not produce a valid link yet." />
                )}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            onChange([...channels, {type: 'whatsapp', label: '', value: ''}])
          }
        >
          <PlusIcon data-icon="inline-start" />
          <Trans message="Add contact button" />
        </Button>
        {!channels.length && (
          <p className="text-xs leading-5 text-muted-foreground">
            <Trans message="No contact buttons yet. Visitors can always send an inquiry instead." />
          </p>
        )}
      </div>
    </div>
  );
}