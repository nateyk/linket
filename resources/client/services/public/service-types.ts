import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import type {Biolink} from '@app/gen/schemas/biolink';
import type {ServiceContactChannel} from './service-contact-links';

export type PublicService = {
  id: number;
  slug: string;
  title: string;
  category?: string | null;
  short_description?: string | null;
  skills: string[];
  cover?: {url: string} | null;
  packages_count: number;
  starting_price_cents: number | null;
  currency: string;
  public_url: string;
};

export type PublicServicePackage = {
  id: number;
  name: string;
  description?: string | null;
  price_cents: number | null;
  currency: string;
  delivery_days: number | null;
  revisions: number | null;
  features: string[];
};

export type PublicServiceFaq = {
  id: number;
  question: string;
  answer: string;
};

export type PublicServiceDetail = PublicService & {
  description?: string | null;
  gallery?: {id: number; url: string}[];
  video_url?: string | null;
  live_demo_url?: string | null;
  contact_channels: ServiceContactChannel[];
  packages: PublicServicePackage[];
  faqs: PublicServiceFaq[];
};

export type PublicStore = Biolink & {
  public_service_count?: number;
  password?: string | null;
};

export type PublicServicePageData = {
  store: PublicStore;
  appearance: BiolinkAppearanceConfig | null;
  service: PublicServiceDetail;
  inquiry_endpoint: string;
  back_url: string;
};
