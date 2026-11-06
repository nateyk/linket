import {Badge} from '@shadcn/badge/badge';
import {Card} from '@shadcn/card/card';
import {parseEtbToCents} from '@app/dashboard/digital-products/product-create-flow';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  BriefcaseBusinessIcon,
  CircleAlertIcon,
  LinkIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  SendIcon,
} from 'lucide-react';
import type {ServiceContactChannelType, ServiceFormState} from '../service-form-state';

function contactIcon(type: ServiceContactChannelType) {
  switch (type) {
    case 'whatsapp':
      return MessageCircleIcon;
    case 'telegram':
      return SendIcon;
    case 'email':
      return MailIcon;
    case 'phone':
      return PhoneIcon;
    default:
      return LinkIcon;
  }
}

/** Unlabelled channels fall back to the channel's name, never its enum key. */
const CONTACT_CHANNEL_LABELS: Partial<
  Record<ServiceContactChannelType, ReturnType<typeof message>>
> = {
  whatsapp: message('WhatsApp'),
  telegram: message('Telegram'),
  email: message('Email'),
  phone: message('Phone'),
  link: message('Website'),
};

/**
 * What a visitor gets. It reads the same state the form writes, so it is
 * live by construction — no second source of truth to drift. In a draft it
 * says so, because a preview that looks published teaches the wrong thing.
 */
export function ServicePreview({state}: {state: ServiceFormState}) {
  const {trans} = useTrans();
  const namedPackages = state.packages.filter(item => item.name.trim());
  const prices = namedPackages
    .map(item => parseEtbToCents(item.price))
    .filter((price): price is number => price !== null);
  const startingPrice = prices.length ? Math.min(...prices) : null;
  const title = state.title.trim();
  const isDraft = state.status !== 'published';
  const skills = state.skills
    .split(',')
    .map(skill => skill.trim())
    .filter(Boolean);
  const filledChannels = state.contact_channels.filter(item =>
    item.value.trim(),
  );

  return (
    <Card.Root className="gap-0 overflow-hidden py-0">
      <div
        className={cn(
          'relative w-full overflow-hidden bg-muted',
          // An empty preview should not open with a cavernous grey box; the
          // placeholder only claims card height until a cover exists.
          state.cover_url ? 'aspect-video' : 'h-28',
        )}
      >
        {state.cover_url ? (
          <img
            src={state.cover_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <BriefcaseBusinessIcon className="size-10 opacity-65" />
          </div>
        )}
      </div>

      <Card.Content className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && (
              <Badge variant="secondary" className="w-fit">
                <Trans message="Draft — not visible to visitors yet" />
              </Badge>
            )}
            {state.category.trim() && (
              <Badge variant="secondary" className="w-fit">
                {state.category.trim()}
              </Badge>
            )}
          </div>
          <p className="text-base leading-6 font-semibold text-balance">
            {title || (
              <span className="text-muted-foreground">
                <Trans message="Untitled service" />
              </span>
            )}
          </p>
          {state.short_description.trim() && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {state.short_description.trim()}
            </p>
          )}
          {!!skills.length && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {skills.slice(0, 5).map(skill => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Keyed on presence, never on the value: keying on the amount would remount
            the node and replay the fade on every price keystroke. */}
        <p
          key={startingPrice === null ? 'quote' : 'price'}
          className="animate-in fade-in text-sm font-medium duration-200"
        >
          {startingPrice === null ? (
            <Trans message="Request a quote" />
          ) : (
            <span className="inline-flex items-baseline gap-1.5">
              <Trans message="Starting at" />
              <span>{formatMoney(startingPrice, 'ETB')}</span>
            </span>
          )}
        </p>

        {!!namedPackages.length && (
          <ul
            key={`packages-${namedPackages.length}`}
            className="animate-in fade-in divide-y border-y duration-200"
          >
            {namedPackages.slice(0, 4).map((item, index) => {
              const price = parseEtbToCents(item.price);
              const delivery = item.delivery_days.trim();
              const revisions = item.revisions.trim();

              return (
                <li
                  key={item.id ?? `new-${index}`}
                  className="flex items-baseline justify-between gap-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.name.trim()}
                    </span>
                    {!!(delivery || revisions) && (
                      <span className="text-xs text-muted-foreground">
                        {delivery && (
                          <Trans
                            message=":count days delivery"
                            values={{count: delivery}}
                          />
                        )}
                        {delivery && revisions ? ' · ' : null}
                        {revisions && (
                          <Trans
                            message=":count revisions"
                            values={{count: revisions}}
                          />
                        )}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {price === null ? (
                      <Trans message="Quote" />
                    ) : (
                      formatMoney(price, 'ETB')
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {!!filledChannels.length && (
          <div
            key={`channels-${filledChannels.length}`}
            className="animate-in fade-in flex flex-wrap gap-1.5 duration-200"
          >
            {filledChannels.slice(0, 4).map(channel => {
              const Icon = contactIcon(channel.type);
              return (
                <span
                  key={`${channel.type}-${channel.value}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-button border border-border px-2 py-1 text-xs font-medium text-muted-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {channel.label.trim() ||
                    trans(
                      CONTACT_CHANNEL_LABELS[channel.type] ??
                        message('Link'),
                    )}
                </span>
              );
            })}
          </div>
        )}
      </Card.Content>

      <Card.Footer className="flex items-start gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
        <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
        <Trans message="Preview only. Visitors see this on your storefront once you publish." />
      </Card.Footer>
    </Card.Root>
  );
}