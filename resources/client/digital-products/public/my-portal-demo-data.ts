import type {PortalCourse} from './my-portal-library-ui';

export type DemoOrderDownload = {
  id: number;
  name: string | null;
  remaining_downloads: number;
  expires_at: string | null;
  available: boolean;
};

export type DemoOrder = {
  id: string;
  product_title: string | null;
  product_cover?: string | null;
  product_type?: string | null;
  course_id?: number | null;
  currency: string;
  gross_amount_cents: number;
  paid_at: string | null;
  receipt_sent_at: string | null;
  review: {
    stars: number | null;
    title: string | null;
    review: string | null;
  } | null;
  downloads: DemoOrderDownload[];
  is_demo?: boolean;
};

/** Placeholder courses for empty portal layout preview. Replace with live library data. */
export const DEMO_PORTAL_COURSES: PortalCourse[] = [
  {
    course_id: -101,
    title: 'Advanced AI Applications & Intelligent Workflows',
    cover: null,
    creator_name: 'Alex Rivera',
    total_lessons: 24,
    percent: 42,
    lessons_done: 10,
    next_lesson_id: null,
    next_lesson_title: 'Building agent workflows',
    is_demo: true,
  },
  {
    course_id: -102,
    title: 'Product Strategy & Business Scaling for Startups',
    cover: null,
    creator_name: 'Jordan Lee',
    total_lessons: 18,
    percent: 78,
    lessons_done: 14,
    next_lesson_id: null,
    next_lesson_title: 'Pricing experiments',
    is_demo: true,
  },
  {
    course_id: -103,
    title: 'UI/UX Design: From Wireframe to Prototype',
    cover: null,
    creator_name: 'Sam Okonkwo',
    total_lessons: 32,
    percent: 100,
    lessons_done: 32,
    completed_at: '2026-09-01T12:00:00Z',
    is_demo: true,
  },
  {
    course_id: -104,
    title: 'Performance Marketing & Growth Strategy',
    cover: null,
    creator_name: 'Casey Nguyen',
    total_lessons: 20,
    percent: 0,
    lessons_done: 0,
    next_lesson_id: null,
    next_lesson_title: 'Channel foundations',
    is_demo: true,
  },
];

/** Placeholder file purchases for empty downloads section. */
export const DEMO_DOWNLOAD_ORDERS: DemoOrder[] = [
  {
    id: 'demo-order-pack',
    product_title: 'Brand Kit Starter Pack',
    product_cover: null,
    product_type: 'download',
    currency: 'USD',
    gross_amount_cents: 4900,
    paid_at: '2026-08-12T10:00:00Z',
    receipt_sent_at: '2026-08-12T10:01:00Z',
    review: null,
    is_demo: true,
    downloads: [
      {
        id: -201,
        name: 'Brand-Kit.zip',
        remaining_downloads: 5,
        expires_at: null,
        available: true,
      },
      {
        id: -202,
        name: 'Logo-Assets.zip',
        remaining_downloads: 5,
        expires_at: null,
        available: true,
      },
    ],
  },
  {
    id: 'demo-order-guide',
    product_title: 'Creator Launch Checklist (PDF)',
    product_cover: null,
    product_type: 'download',
    currency: 'USD',
    gross_amount_cents: 1900,
    paid_at: '2026-09-03T14:30:00Z',
    receipt_sent_at: null,
    review: null,
    is_demo: true,
    downloads: [
      {
        id: -203,
        name: 'Creator-Launch-Checklist.pdf',
        remaining_downloads: 3,
        expires_at: '2027-09-03T00:00:00Z',
        available: true,
      },
    ],
  },
];

/** Placeholder audio packs for empty audio library preview. */
export const DEMO_AUDIO_ORDERS: DemoOrder[] = [
  {
    id: 'demo-order-audio',
    product_title: 'Midnight Signals — Beat Pack',
    product_cover: null,
    product_type: 'audio',
    currency: 'USD',
    gross_amount_cents: 2900,
    paid_at: '2026-09-20T09:00:00Z',
    receipt_sent_at: '2026-09-20T09:01:00Z',
    review: null,
    is_demo: true,
    downloads: [
      {
        id: -301,
        name: 'Midnight-Signals-01.wav',
        remaining_downloads: 10,
        expires_at: null,
        available: true,
      },
      {
        id: -302,
        name: 'Midnight-Signals-02.wav',
        remaining_downloads: 10,
        expires_at: null,
        available: true,
      },
    ],
  },
];
