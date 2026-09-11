import type {LucideIcon} from 'lucide-react';
import {
  BarChart,
  CodeIcon,
  FileText,
  GlobeIcon,
  Handshake,
  HelpCircle,
  LayersIcon,
  Leaf,
  PlugIcon,
  RotateCcw,
  Shield,
  Star,
  UserPlusIcon,
  Users,
} from 'lucide-react';

export type LinkItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

// Preserved Linket landing nav IA — used by the customization pass that
// rebrands the template header copy back to Linket content.
export const productLinks: LinkItem[] = [
  {
    title: 'Website Builder',
    href: '#',
    description: 'Create responsive websites with ease',
    icon: GlobeIcon,
  },
  {
    title: 'Cloud Platform',
    href: '#',
    description: 'Deploy and scale apps in the cloud',
    icon: LayersIcon,
  },
  {
    title: 'Team Collaboration',
    href: '#',
    description: 'Tools to help your teams work better together',
    icon: UserPlusIcon,
  },
  {
    title: 'Analytics',
    href: '#',
    description: 'Track and analyze your website traffic',
    icon: BarChart,
  },
  {
    title: 'Integrations',
    href: '#',
    description: 'Connect your apps and services',
    icon: PlugIcon,
  },
  {
    title: 'API',
    href: '#',
    description: 'Build custom integrations with our API',
    icon: CodeIcon,
  },
];

export const companyLinks: LinkItem[] = [
  {
    title: 'About Us',
    href: '#',
    description: 'Learn more about our story and team',
    icon: Users,
  },
  {
    title: 'Customer Stories',
    href: '#',
    description: 'See how we’ve helped our clients succeed',
    icon: Star,
  },
  {
    title: 'Partnerships',
    href: '#',
    icon: Handshake,
    description: 'Collaborate with us for mutual growth',
  },
];

export const companyLinks2: LinkItem[] = [
  {
    title: 'Terms of Service',
    href: '#',
    icon: FileText,
  },
  {
    title: 'Privacy Policy',
    href: '#',
    icon: Shield,
  },
  {
    title: 'Refund Policy',
    href: '#',
    icon: RotateCcw,
  },
  {
    title: 'Blog',
    href: '#',
    icon: Leaf,
  },
  {
    title: 'Help Center',
    href: '#',
    icon: HelpCircle,
  },
];
