import type {LandingPageImageConfig} from '@common/ui/landing-page/landing-page-config';
import {Trans} from '@ui/i18n/trans';

export type CreatorStory = {
  creatorName: string;
  role?: string;
  quote?: string;
  storefrontPath: string;
  image?: LandingPageImageConfig;
  imageAlt?: string;
  approved?: boolean;
};

export type CreatorStoriesConfig = {
  name: 'creator-stories';
  title?: string;
  description?: string;
  badge?: string;
  stories?: CreatorStory[];
};

// Only same-site storefront paths are accepted; never turn an admin-entered
// javascript: URL or cross-origin URL into a public marketing link.
export function safeStorefrontPath(path: string): string | null {
  return /^\/[a-zA-Z0-9][a-zA-Z0-9\/_-]*$/.test(path) ? path : null;
}

export function publishableCreatorStories(stories: CreatorStory[] = []): CreatorStory[] {
  return stories.filter(story =>
    story.approved === true &&
    Boolean(story.creatorName?.trim()) &&
    Boolean(story.image?.src) &&
    Boolean(safeStorefrontPath(story.storefrontPath)),
  );
}

export function CreatorStories({config}: {config: CreatorStoriesConfig}) {
  const stories = publishableCreatorStories(config.stories);
  // Never render placeholder stories, unapproved testimonials or empty grids.
  if (!stories.length) return null;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {config.badge ? (
            <p className="text-sm font-semibold text-primary">
              <Trans message={config.badge} />
            </p>
          ) : null}
          {config.title ? (
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
              <Trans message={config.title} />
            </h2>
          ) : null}
          {config.description ? (
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              <Trans message={config.description} />
            </p>
          ) : null}
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
          {stories.map((story, index) => (
            <li key={`${story.storefrontPath}-${index}`} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="aspect-[5/4] overflow-hidden border-b border-border/60 bg-muted/35">
                <img
                  src={story.image!.src}
                  width={story.image!.width}
                  height={story.image!.height}
                  alt={story.imageAlt || `Storefront preview for ${story.creatorName}`}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-contain"
                />
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  <Trans message={story.creatorName} />
                </h3>
                {story.role ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Trans message={story.role} />
                  </p>
                ) : null}
                {story.quote?.trim() ? (
                  <blockquote className="mt-4 text-sm leading-6 text-foreground/85">
                    “<Trans message={story.quote.trim()} />”
                  </blockquote>
                ) : null}
                <a
                  href={safeStorefrontPath(story.storefrontPath)!}
                  className="mt-5 inline-flex rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                  aria-label={`View ${story.creatorName}'s Linket storefront`}
                >
                  <Trans message="View storefront" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
