import {resolveBiolinkThemeVariables} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Background} from '@app/short-links/renderers/biolink-renderer/biolink-background';
import {Accordion} from '@shadcn/accordion/accordion';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {loadFonts} from '@ui/fonts/font-picker/load-fonts';
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
import {useEffect, useState, type CSSProperties} from 'react';
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
  const selectedPackage = service.packages.find(
    packageItem => packageItem.id === packageId,
  );
  const contactChannels = service.contact_channels
    .map(channel => ({channel, href: contactChannelHref(channel)}))
    .filter(
      (item): item is {channel: (typeof service.contact_channels)[number]; href: string} =>
        !!item.href,
    );

  useEffect(() => {
    if (!appearance?.fontConfig) return;
    loadFonts([appearance.fontConfig], {
      id: 'creator-services-fonts',
      weights: [400, 500, 600, 700],
    });
  }, [appearance?.fontConfig]);

  const requestQuote = (nextPackageId?: number) => {
    setPackageId(nextPackageId);
    setInquiryOpen(true);
  };

  return (
    <div
      className="relative isolate min-h-screen px-4 py-5 text-[var(--biolink-text)] sm:px-6 sm:py-10"
      style={
        {
          ...resolveBiolinkThemeVariables(appearance),
          fontFamily: appearance?.fontConfig?.family,
        } as CSSProperties
      }
    >
      <div className="fixed inset-0 z-0">
        <Background appearance={appearance} />
      </div>

      <main className="relative z-1 mx-auto flex w-full max-w-6xl flex-col gap-6">
        <a
          href={back_url}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--biolink-muted-text)] underline-offset-4 hover:text-[var(--biolink-text)] hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          <Trans message="Back to services" />
        </a>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <ServiceGallery
              images={service.gallery ?? []}
              title={service.title}
            />

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {service.category && (
                  <Badge variant="secondary">{service.category}</Badge>
                )}
                {service.skills.map(skill => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
              <h1 className="text-2xl leading-8 font-semibold tracking-tight text-balance sm:text-3xl sm:leading-10">
                {service.title}
              </h1>
              {service.short_description && (
                <p className="text-base leading-relaxed text-[var(--biolink-muted-text)]">
                  {service.short_description}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {service.video_url && (
                  <Button
                    variant="outline"
                    render={
                      <a
                        href={service.video_url}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <VideoIcon data-icon="inline-start" />
                    <Trans message="Video preview" />
                  </Button>
                )}
                {service.live_demo_url && (
                  <Button
                    variant="outline"
                    render={
                      <a
                        href={service.live_demo_url}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <ExternalLinkIcon data-icon="inline-start" />
                    <Trans message="Live demo" />
                  </Button>
                )}
              </div>
            </div>

            <Card.Root>
              <Card.Content className="p-4">
                {service.faqs.length ? (
                  <Tabs.Root defaultValue="description" className="gap-4">
                    <Tabs.List
                      aria-label={trans({message: 'Service information'})}
                      className="w-fit"
                    >
                      <Tabs.Tab value="description">
                        <Trans message="Description" />
                      </Tabs.Tab>
                      <Tabs.Tab value="faq">
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
                            <Accordion.Trigger>
                              {faq.question}
                            </Accordion.Trigger>
                            <Accordion.Content>
                              <p className="text-sm leading-relaxed text-[var(--biolink-muted-text)]">
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

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            <ServicePackagePanel
              packages={service.packages}
              onRequest={requestQuote}
            />

            <Card.Root>
              <Card.Content className="flex flex-col gap-4 p-4">
                <h2 className="text-base font-semibold">
                  <Trans message="About the seller" />
                </h2>
                <div className="flex items-center gap-3">
                  <Avatar.Root className="size-12 shrink-0 overflow-hidden">
                    <Avatar.Image src={avatarUrl} alt={displayName} />
                    <Avatar.ColorFallback>
                      {displayName}
                    </Avatar.ColorFallback>
                  </Avatar.Root>
                  <div className="flex min-w-0 flex-col">
                    <p className="truncate text-sm font-medium">
                      {displayName}
                    </p>
                    {profile.profile_title && (
                      <p className="truncate text-xs text-[var(--biolink-muted-text)]">
                        {profile.profile_title}
                      </p>
                    )}
                  </div>
                </div>

                <Button onClick={() => requestQuote()}>
                  <Trans message="Send inquiry" />
                </Button>

                {!!contactChannels.length && (
                  <div className="flex flex-col gap-2">
                    {contactChannels.map(({channel, href}) => (
                      <Button
                        key={`${channel.type}-${channel.value}`}
                        variant="outline"
                        render={
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        <ContactIcon type={channel.type} />
                        {channel.label || channel.value}
                      </Button>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card.Root>
          </aside>
        </div>
      </main>

      <ServiceInquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        endpoint={inquiry_endpoint}
        packageId={packageId}
        packageName={selectedPackage?.name}
      />
    </div>
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
      className="prose prose-sm max-w-none text-[var(--biolink-text)] prose-headings:text-[var(--biolink-text)] prose-p:text-[var(--biolink-muted-text)] prose-strong:text-[var(--biolink-text)] prose-a:text-primary"
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
