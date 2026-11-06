import {parseEtbToCents} from '@app/dashboard/digital-products/product-create-flow';

export type ServiceContactChannelType =
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'phone'
  | 'link';

export type ServiceFormPackage = {
  id?: number;
  /** Editor-only: protect older extra packages from filling disabled fixed tiers. */
  legacy?: true;
  name: string;
  description: string;
  price: string;
  delivery_days: string;
  revisions: string;
  features: string;
};

export type ServiceFormFaq = {
  id?: number;
  question: string;
  answer: string;
};

export type ServiceFormContactChannel = {
  type: ServiceContactChannelType;
  label: string;
  value: string;
};

export type ServiceFormState = {
  store_id: string;
  title: string;
  short_description: string;
  description: string;
  category: string;
  service_category_id: number | null;
  service_subcategory_id: number | null;
  skills: string;
  cover_url: string;
  cover_file_entry_id: number | null;
  gallery: {id: number; file_entry_id: number; url: string}[];
  video_url: string;
  live_demo_url: string;
  status: 'draft' | 'published';
  packages: ServiceFormPackage[];
  faqs: ServiceFormFaq[];
  contact_channels: ServiceFormContactChannel[];
};

export type CreatorServiceResource = {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  category?: string | null;
  service_category_id?: number | null;
  service_subcategory_id?: number | null;
  skills?: string[];
  short_description?: string | null;
  description?: string | null;
  video_url?: string | null;
  live_demo_url?: string | null;
  contact_channels?: ServiceFormContactChannel[];
  cover?: {id: number; url: string} | null;
  gallery?: {id: number; file_entry_id: number; url: string}[];
  packages?: {
    id: number;
    name: string;
    description?: string | null;
    price_cents: number | null;
    currency: string;
    delivery_days: number | null;
    revisions: number | null;
    features: string[];
    position: number;
  }[];
  faqs?: {
    id: number;
    question: string;
    answer: string;
    position: number;
  }[];
  store?: {id: number; name: string; short_url: string} | null;
  public_url: string;
};

export type ServicePayload = {
  store_id: number;
  title: string;
  short_description: string | null;
  description: string;
  category: string | null;
  service_category_id: number | null;
  service_subcategory_id: number | null;
  skills: string[];
  cover_file_entry_id: number | null;
  gallery_file_entry_ids: number[];
  video_url: string | null;
  live_demo_url: string | null;
  status: 'draft' | 'published';
  packages: {
    id?: number;
    name: string;
    description: string;
    price_cents: number | null;
    delivery_days: number | null;
    revisions: number | null;
    features: string[];
  }[];
  faqs: {question: string; answer: string}[];
  contact_channels: ServiceFormContactChannel[];
};

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

export function emptyServiceForm(): ServiceFormState {
  return {
    store_id: '',
    title: '',
    short_description: '',
    description: '',
    category: '',
    service_category_id: null,
    service_subcategory_id: null,
    skills: '',
    cover_url: '',
    cover_file_entry_id: null,
    gallery: [],
    video_url: '',
    live_demo_url: '',
    status: 'draft',
    packages: [],
    faqs: [],
    contact_channels: [],
  };
}

export function fromServiceResource(
  service: CreatorServiceResource,
): ServiceFormState {
  return {
    store_id: service.store ? String(service.store.id) : '',
    title: service.title,
    short_description: service.short_description ?? '',
    description: service.description ?? '',
    category: service.category ?? '',
    service_category_id: service.service_category_id ?? null,
    service_subcategory_id: service.service_subcategory_id ?? null,
    skills: (service.skills ?? []).join(', '),
    cover_url: service.cover?.url ?? '',
    cover_file_entry_id: service.cover?.id ?? null,
    gallery: service.gallery ?? [],
    video_url: service.video_url ?? '',
    live_demo_url: service.live_demo_url ?? '',
    status: service.status,
    packages:
      service.packages?.length
        ? service.packages.map(packageItem => ({
            id: packageItem.id,
            name: packageItem.name,
            description: packageItem.description ?? '',
            price:
              packageItem.price_cents === null
                ? ''
                : String(packageItem.price_cents / 100),
            delivery_days:
              packageItem.delivery_days === null
                ? ''
                : String(packageItem.delivery_days),
            revisions:
              packageItem.revisions === null
                ? ''
                : String(packageItem.revisions),
            features: packageItem.features.join('\n'),
          }))
        : [blankPackage()],
    faqs:
      service.faqs?.map(faq => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
      })) ?? [],
    contact_channels: (service.contact_channels ?? []).map(channel => ({
      type: channel.type,
      label: channel.label,
      value: channel.value,
    })),
  };
}

export function serviceFormClientErrors(
  form: ServiceFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};

  form.packages.forEach((item, index) => {
    const name = item.name.trim();
    const hasUnfinishedContent = [
      item.description,
      item.price,
      item.delivery_days,
      item.revisions,
      item.features,
    ].some(value => value.trim());

    if (!name && hasUnfinishedContent) {
      errors[`packages.${index}.name`] =
        'Add a package name or remove this unfinished package.';
      return;
    }
    if (!name) return;

    if (item.price.trim()) {
      const cents = parseEtbToCents(item.price);
      if (cents === null || cents > 1_000_000_000) {
        errors[`packages.${index}.price_cents`] =
          'Enter a valid price from 0 to 10,000,000 ETB.';
      }
    }

    if (
      item.delivery_days.trim() &&
      !integerInRange(item.delivery_days, 0, 365)
    ) {
      errors[`packages.${index}.delivery_days`] =
        'Delivery days must be a whole number from 0 to 365.';
    }

    if (
      item.revisions.trim() &&
      !integerInRange(item.revisions, 0, 100)
    ) {
      errors[`packages.${index}.revisions`] =
        'Revisions must be a whole number from 0 to 100.';
    }

    const features = item.features
      .split('\n')
      .map(feature => feature.trim())
      .filter(Boolean);
    if (
      features.length > 20 ||
      features.some(feature => feature.length > 200)
    ) {
      errors[`packages.${index}.features`] =
        'Use no more than 20 features, with 200 characters or fewer per feature.';
    }
  });

  form.faqs.forEach((faq, index) => {
    const question = faq.question.trim();
    const answer = faq.answer.trim();
    if (question && !answer) {
      errors[`faqs.${index}.answer`] =
        'Add an answer or remove this unfinished FAQ.';
    } else if (!question && answer) {
      errors[`faqs.${index}.question`] =
        'Add a question or remove this unfinished FAQ.';
    }
  });

  form.contact_channels.forEach((channel, index) => {
    if (channel.label.trim() && !channel.value.trim()) {
      errors[`contact_channels.${index}.value`] =
        'Add a contact value or remove this unfinished contact button.';
    }
  });

  return errors;
}

function integerInRange(value: string, min: number, max: number): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

export function toServicePayload(form: ServiceFormState): ServicePayload {
  return {
    store_id: Number(form.store_id),
    title: form.title.trim(),
    short_description: form.short_description.trim() || null,
    description: form.description,
    category: form.category.trim() || null,
    service_category_id: form.service_category_id,
    service_subcategory_id: form.service_subcategory_id,
    skills: form.skills
      .split(',')
      .map(skill => skill.trim())
      .filter(Boolean),
    cover_file_entry_id: form.cover_file_entry_id,
    gallery_file_entry_ids: form.gallery.map(item => item.file_entry_id),
    video_url: form.video_url.trim() || null,
    live_demo_url: form.live_demo_url.trim() || null,
    status: form.status,
    packages: form.packages
      .filter(item => item.name.trim())
      .map(item => ({
        ...(item.id ? {id: item.id} : {}),
        name: item.name.trim(),
        description: item.description.trim(),
        price_cents: parseEtbToCents(item.price),
        delivery_days: integerOrNull(item.delivery_days),
        revisions: integerOrNull(item.revisions),
        features: item.features
          .split('\n')
          .map(feature => feature.trim())
          .filter(Boolean),
      })),
    faqs: form.faqs
      .filter(item => item.question.trim() && item.answer.trim())
      .map(item => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
    contact_channels: form.contact_channels
      .filter(item => item.value.trim())
      .map(item => ({
        type: item.type,
        label: item.label.trim(),
        value: item.value.trim(),
      })),
  };
}

function integerOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
