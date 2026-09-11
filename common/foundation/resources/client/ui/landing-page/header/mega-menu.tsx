'use client';

import {
  BarChart3Icon,
  Building2Icon,
  CrownIcon,
  DatabaseIcon,
  LayoutIcon,
  PaletteIcon,
  PackageIcon,
  RocketIcon,
  SettingsIcon,
  ShieldIcon,
  ZapIcon,
} from 'lucide-react';

const menuSections = [
  {
    title: 'Browse Products',
    items: [
      {
        title: 'Free Blocks',
        description: 'Essential UI components and sections',
        icon: PackageIcon,
        href: '#free-blocks',
      },
      {
        title: 'Premium Templates',
        description: 'Complete page templates and layouts',
        icon: CrownIcon,
        href: '#premium-templates',
      },
      {
        title: 'Admin Dashboards',
        description: 'Full-featured dashboard solutions',
        icon: BarChart3Icon,
        href: '#admin-dashboards',
      },
      {
        title: 'Landing Pages',
        description: 'Marketing and product landing templates',
        icon: LayoutIcon,
        href: '#landing-pages',
      },
    ],
  },
  {
    title: 'Categories',
    items: [
      {
        title: 'E-commerce',
        description: 'Online store admin panels and components',
        icon: Building2Icon,
        href: '#ecommerce',
      },
      {
        title: 'SaaS Dashboards',
        description: 'Application admin interfaces',
        icon: RocketIcon,
        href: '#saas-dashboards',
      },
      {
        title: 'Analytics',
        description: 'Data visualization and reporting templates',
        icon: BarChart3Icon,
        href: '#analytics',
      },
      {
        title: 'Authentication',
        description: 'Login, signup, and user management pages',
        icon: ShieldIcon,
        href: '#authentication',
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        title: 'Documentation',
        description: 'Integration guides and setup instructions',
        icon: DatabaseIcon,
        href: '#docs',
      },
      {
        title: 'Component Showcase',
        description: 'Interactive preview of all components',
        icon: PaletteIcon,
        href: '#showcase',
      },
      {
        title: 'GitHub Repository',
        description: 'Open source foundation and community',
        icon: SettingsIcon,
        href: '#github',
      },
      {
        title: 'Design System',
        description: 'shadcn/ui standards and customization',
        icon: ZapIcon,
        href: '#design-system',
      },
    ],
  },
];

export function MegaMenu() {
  return (
    <div className="w-[700px] max-w-[95vw] p-4 sm:p-6 lg:p-8 bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
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
