'use client';

import {
  BarChart3Icon,
  CrownIcon,
  LayoutTemplateIcon,
  Link2Icon,
  QrCodeIcon,
  ZapIcon,
} from 'lucide-react';

// Hrefs must match the anchors derived in landing-page.tsx (buildSectionAnchors),
// or the section's own id. Verify after editing settings content that changes
// section titles — a renamed title moves the anchor and this menu silently stops
// scrolling.
const menuSections = [
  {
    title: 'Create',
    items: [
      {
        title: 'Short links',
        description: 'Custom back-halves, link types and splash pages',
        icon: Link2Icon,
        href: '#short-urls-with-serious-control',
      },
      {
        title: 'Storefront',
        description: 'A link-in-bio page for everything you share',
        icon: LayoutTemplateIcon,
        href: '#one-link-for-everything-you-share',
      },
      {
        title: 'QR codes',
        description: 'Turn any link into a scannable, trackable code',
        icon: QrCodeIcon,
        href: '#turn-any-link-into-a-scannable-code',
      },
    ],
  },
  {
    title: 'Manage & measure',
    items: [
      {
        title: 'Everything in one place',
        description: 'Branded links, link-in-bio pages and click analytics',
        icon: BarChart3Icon,
        href: '#links-that-work-harder-for-you',
      },
      {
        title: 'Growth toolkit',
        description: 'Custom domains, folders, pixels, overlays and API',
        icon: ZapIcon,
        href: '#the-toolkit-serious-marketers-expect',
      },
      {
        title: 'Plans & pricing',
        description: 'Free to start, Pro when you outgrow it',
        icon: CrownIcon,
        href: '#pricing-section',
      },
    ],
  },
];

export function MegaMenu() {
  return (
    <div className="w-[700px] max-w-[95vw] p-4 sm:p-6 lg:p-8 bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
        {menuSections.map(section => (
          <div key={section.title} className="flex flex-col gap-4 lg:gap-6">
            {/* Section Header */}
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {section.title}
            </h3>

            {/* Section Links */}
            <div className="flex flex-col gap-3 lg:gap-4">
              {section.items.map(item => (
                <a
                  key={item.title}
                  href={item.href}
                  className="group flex flex-col gap-1 lg:gap-2 hover:bg-accent rounded-md p-2 lg:p-3 -mx-2 lg:-mx-3 transition-colors my-0"
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed ml-6 lg:ml-7">
                    {item.description}
                  </p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
