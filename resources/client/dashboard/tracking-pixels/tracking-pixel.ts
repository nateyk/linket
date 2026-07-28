export interface TrackingPixel {
  id: number;
  name: string;
  type: string;
  pixel_id: string;
  user_id: number;
  user?: {
    id: number;
    email: string;
    name: string;
    avatar?: string | null;
  };
  head_code?: string;
  body_code?: string;
  updated_at: string;
  deleted_at: string | null;
  model_type: 'trackingPixel';
}
