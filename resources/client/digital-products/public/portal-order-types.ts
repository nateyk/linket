export type PortalOrderDownload = {
  id: number;
  name: string | null;
  remaining_downloads: number;
  expires_at: string | null;
  available: boolean;
};

export type PortalOrder = {
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
  downloads: PortalOrderDownload[];
  is_demo?: boolean;
};

export const PORTAL_EMAIL_KEY = 'my-portal-email';
