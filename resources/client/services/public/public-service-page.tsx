import {
  biolinkSurfaceCard,
  biolinkSurfaceContent,
  biolinkSectionTitle,
} from '@app/digital-products/public/product-page/surface';
import {PasswordPage} from '@app/short-links/password-page';
import {
  biolinkSurfaceEdgeClassName,
  resolveBiolinkButtonAppearance,
  resolveBiolinkContainerRadius,
  resolveBiolinkSegmentedTabsAppearance,
  resolveBiolinkPublicAppearanceStyle,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Background} from '@app/short-links/renderers/biolink-renderer/biolink-background';
import {Accordion} from '@shadcn/accordion/accordion';
import {Avatar} from '@shadcn/avatar/avatar';
import {Button, buttonVariants} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Tabs} from '@shadcn/tabs/tabs';
import {loadFonts} from '@ui/fonts/font-picker/load-fonts';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {MotionConfig} from 'framer-motion';
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  LinkIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  SendIcon,
  VideoIcon,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {contactChannelHref} from './service-contact-links';
import {ServiceGallery} from './service-gallery';
import {ServiceInquiryDialog} from './service-inquiry-dialog';
import {ServicePackagePanel} from './service-package-panel';
import type {PublicServicePageData} from './service-types';

export function PublicServicePage({data}: {data: PublicServicePageData}) {
  const {store, appearance, service, inquiry_endpoint, back_url} = data;
  const {trans} = useTrans();
  const profile = store.profile_config ?? {};
  const displayName = profile.display_name || store.name;
  const avatarUrl = profile.avatar_url || store.user?.image;
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [packageId, setPackageId] = useState<number>();
  // The mobile sticky action follows the tier the visitor last selected.
  const [selectedOfferPackageId, setSelectedOfferPackageId] = useState<
    number | undefined
  >(service.packages[0]?.id);
  const selectedPackage = service.packages.find(
    packageItem => packageItem.id === packageId,
  );
  // Contact methods are secondary to the package-specific inquiry. Never
  // repeat the same destination as separate focusable actions.
  const seenContactHrefs = new Set<string>();
  const contactChannels = service.contact_channels
    .map(channel => ({channel, href: contactChannelHref(channel)}))
    .filter(
      (
        item,
      ): item is {
        channel: (typeof service.contact_channels)[number];
        href: string;
      } => !!item.href,
    )
    .filter(({href}) => {
      if (seenContactHrefs.has(href)) return false;
      seenContactHrefs.add(href);
      return true;
    });

  const [passwordValid, setPasswordValid] = useState(!store.password);
  const packagePanelRef = useRef<HTMLDivElement | null>(null);
  const [railInView, setRailInView] = useState(false);

  // On a phone the rail is below the fold, so the bar is the only always-
  // reachable action; it steps aside once the rail itself is on screen and
  // never repeats the same request twice.
  useEffect(() => {
    const panel = packagePanelRef.current;
    if (!panel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setRailInView(entry.isIntersecting),
      {threshold: 0},
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const containerRadius = resolveBiolinkContainerRadius(appearance);
  const segmented = resolveBiolinkSegmentedTabsAppearance(appearance);

  useEffect(() => {
    if (!appearance?.fontConfig) return;
    loadFonts([appearance.fontConfig], {
      id: 'creator-services-fonts',
      weights: [400, 500, 600, 700],
    });
  }, [appearance?.fontConfig]);

  if (store.password && !passwordValid) {
    return (
      <PasswordPage
        linkeable={store}
        onPasswordValid={() => setPasswordValid(true)}
      />
    );
  }

  const requestQuote = (nextPackageId?: number) => {
    setPackageId(nextPackageId);
    setInquiryOpen(true);
  };

  const pricedPackages = service.packages
    .map(packageItem => packageItem.price_cents)
    .filter((price): price is number => price !== null);
  const startingPrice = pricedPackages.length
    ? Math.min(...pricedPackages)
    : null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="relative isolate min-h-screen px-4 py-5 text-[var(--biolink-text)] sm:px-6 sm:py-10"
        style={resolveBiolinkPublicAppearanceStyle(appearance)}
      >
        <div className="fixed inset-0 z-0">
          <Background appearance={appearance} />
        </div>

        <main className="relative z-1 mx-auto flex w-full max-w-5xl flex-col gap-4 pb-24 lg:pb-0">
          <a
            href={back_url}
            className={cn(
              'inline-flex h-9 w-fit items-center gap-2 self-start rounded-button bg-[var(--biolink-surface-strong)] px-3 text-sm font-medium text-[var(--biolink-text)] [box-shadow:var(--biolink-surface-shadow,none)] transition-colors hover:bg-[var(--biolink-surface)] focus-visible:outline-2 focus-visible:outline-offset-4',
              biolinkSurfaceEdgeClassName,
            )}
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            <Trans message="Back to services" />
          </a>

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
            <div className="flex min-w-0 flex-col gap-5">
              <Card.Root className={biolinkSurfaceCard}>
                <ServiceGallery
                  cover={service.cover}
                  images={service.gallery ?? []}
                  title={service.title}
                />

                <Card.Content className={biolinkSurfaceContent}>
                  <h1 className="max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-balance break-words [overflow-wrap:anywhere] sm:text-4xl">
                    {service.title}
                  </h1>

                  {service.short_description && (
                    <p className="max-w-[70ch] text-base leading-6 text-[var(--biolink-muted-text)] break-words [overflow-wrap:anywhere]">
                      {service.short_description}
                    </p>
                  )}

                  {(!!service.category || !!service.skills.length) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {service.category && (
                        <span className="rounded-full bg-[var(--biolink-surface)] px-2.5 py-1 text-xs font-medium text-[var(--biolink-text)] ring-1 ring-(color:--biolink-border)">
                          {service.category}
                        </span>
                      )}
                      {service.skills.map(skill => (
                        <span
                          key={skill}
                          className="rounded-full px-2.5 py-1 text-xs font-medium text-[var(--biolink-muted-text)] ring-1 ring-(color:--biolink-border)"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar.Root
                        size="sm"
                        className={cn(
                          'overflow-hidden bg-[var(--biolink-surface-muted)] after:border-[var(--biolink-border)]',
                          containerRadius.avatarClassName,
                        )}
                      >
                        <Avatar.Image src={avatarUrl} alt="" />
                        <Avatar.ColorFallback>
                          {displayName}
                        </Avatar.ColorFallback>
                      </Avatar.Root>
                      <span className="truncate text-sm font-medium">
                        {displayName}
                      </span>
                    </div>

                    {(service.video_url || service.live_demo_url) && (
                      <div className="flex flex-wrap gap-2">
                        {service.video_url && (
                          <a
                            href={service.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({variant: 'outline', size: 'sm'})}
                          >
                            <VideoIcon data-icon="inline-start" aria-hidden="true" />
                            <Trans message="Video preview" />
                          </a>
                        )}
                        {service.live_demo_url && (
                          <a
                            href={service.live_demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({variant: 'outline', size: 'sm'})}
                          >
                            <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
                            <Trans message="Live demo" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </Card.Content>
              </Card.Root>

              <Card.Root className={biolinkSurfaceCard}>
                <Card.Content className={cn(biolinkSurfaceContent, 'gap-4')}>
                  {service.faqs.length ? (
                    <Tabs.Root defaultValue="description" className="gap-4">
                      <Tabs.List
                        aria-label={trans({message: 'Service information'})}
                        style={segmented.style}
                        indicatorClass={segmented.indicatorClassName}
                        className={cn('w-max shrink-0', segmented.listClassName)}
                      >
                        <Tabs.Tab
                          value="description"
                          className={segmented.tabClassName}
                        >
                          <Trans message="Description" />
                        </Tabs.Tab>
                        <Tabs.Tab value="faq" className={segmented.tabClassName}>
                          <Trans message="FAQ" />
                        </Tabs.Tab>
                      </Tabs.List>
                      <Tabs.Panel value="description">
                        <ServiceDescription html={service.description} />
                      </Tabs.Panel>
                      <Tabs.Panel value="faq">
                        <Accordion.Root variant="separated">
                          {service.faqs.map(faq => (
                            <Accordion.Item key={faq.id}>
                              <Accordion.Trigger className="min-w-0 text-start break-words [overflow-wrap:anywhere]">
                                {faq.question}
                              </Accordion.Trigger>
                              <Accordion.Content>
                                <p className="text-sm leading-relaxed text-[var(--biolink-muted-text)] break-words [overflow-wrap:anywhere]">
                                  {faq.answer}
                                </p>
                              </Accordion.Content>
                            </Accordion.Item>
                          ))}
                        </Accordion.Root>
                      </Tabs.Panel>
                    </Tabs.Root>
                  ) : (
                    <ServiceDescription html={service.description} />
                  )}
                </Card.Content>
              </Card.Root>
            </div>

            <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
              <div ref={packagePanelRef}>
                <ServicePackagePanel
                  packages={service.packages}
                  appearance={appearance}
                  onRequest={requestQuote}
                  onSelect={setSelectedOfferPackageId}
                />
              </div>

              <Card.Root className={biolinkSurfaceCard}>
                <Card.Content className={cn(biolinkSurfaceContent, 'gap-4')}>
                  <h2 className={biolinkSectionTitle}>
                    <Trans message="About the seller" />
                  </h2>

                  <div className="flex items-center gap-3">
                    <Avatar.Root
                      size="lg"
                      className={cn(
                        'overflow-hidden bg-[var(--biolink-surface-muted)] after:border-[var(--biolink-border)]',
                        containerRadius.avatarClassName,
                      )}
                    >
                      <Avatar.Image src={avatarUrl} alt="" />
                      <Avatar.ColorFallback>
                        {displayName}
                      </Avatar.ColorFallback>
                    </Avatar.Root>
                    <div className="flex min-w-0 flex-col">
                      <p className="text-base font-medium break-words [overflow-wrap:anywhere]">
                        {displayName}
                      </p>
                      {profile.profile_title && (
                        <p className="text-sm text-[var(--biolink-muted-text)] break-words [overflow-wrap:anywhere]">
                          {profile.profile_title}
                        </p>
                      )}
                    </div>
                  </div>

                  {!!contactChannels.length && (
                    <div className="flex flex-col gap-2">
                      {contactChannels.map(({channel, href}) => (
                        <a
                          key={href}
                          href={href}
                          // mailto: and tel: should launch their handlers without
                          // opening an unnecessary blank browser tab.
                          target={/^https?:/.test(href) ? '_blank' : undefined}
                          rel={/^https?:/.test(href) ? 'noopener noreferrer' : undefined}
                          className={cn(
                            buttonVariants({variant: 'outline'}),
                            'h-auto min-h-11 w-full justify-start gap-2 whitespace-normal text-start',
                          )}
                        >
                          <ContactIcon type={channel.type} />
                          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                            {channel.label || channel.value}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </Card.Content>
              </Card.Root>
            </aside>
          </div>
        </main>

        {/* On a phone the rail is below the fold, so the same action gets a
            bar the visitor can reach at any scroll position. */}
        <div
          data-testid="service-mobile-action"
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 border-t border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] [box-shadow:var(--biolink-surface-shadow,none)] transition-[transform,visibility] duration-150 ease-in-out motion-reduce:transition-none lg:hidden',
            railInView
              ? 'invisible translate-y-full'
              : 'visible translate-y-0',
          )}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <span className="min-w-0 truncate text-base font-semibold tabular-nums">
              {startingPrice === null ? (
                <Trans message="Custom pricing" />
              ) : (
                <Trans
                  message="From :price"
                  values={{price: formatMoney(startingPrice, service.currency)}}
                />
              )}
            </span>
            <Button
              variant="ghost"
              className={cn('shrink-0', buttonAppearance.className)}
              style={buttonAppearance.style}
              size="lg"
              onClick={() => requestQuote(selectedOfferPackageId)}
            >
              <Trans message="Request a quote" />
            </Button>
          </div>
        </div>

        <ServiceInquiryDialog
          open={inquiryOpen}
          onOpenChange={setInquiryOpen}
          endpoint={inquiry_endpoint}
          packageId={packageId}
          packageName={selectedPackage?.name}
          buyerQuestions={service.buyer_questions}
          appearance={appearance}
        />
      </div>
    </MotionConfig>
  );
}

function ServiceDescription({html}: {html?: string | null}) {
  if (!html) {
    return (
      <p className="text-sm text-[var(--biolink-muted-text)]">
        <Trans message="The creator has not added a description yet." />
      </p>
    );
  }

  return (
    <div
      className="prose prose-sm max-w-none text-[var(--biolink-text)] break-words [overflow-wrap:anywhere] prose-headings:text-[var(--biolink-text)] prose-p:text-[var(--biolink-muted-text)] prose-li:text-[var(--biolink-muted-text)] prose-strong:text-[var(--biolink-text)]"
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}

function ContactIcon({
  type,
}: {
  type: 'whatsapp' | 'telegram' | 'email' | 'phone' | 'link';
}) {
  switch (type) {
    case 'whatsapp':
      return <MessageCircleIcon data-icon="inline-start" />;
    case 'telegram':
      return <SendIcon data-icon="inline-start" />;
    case 'email':
      return <MailIcon data-icon="inline-start" />;
    case 'phone':
      return <PhoneIcon data-icon="inline-start" />;
    default:
      return <LinkIcon data-icon="inline-start" />;
  }
}