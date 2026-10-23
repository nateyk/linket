import {
  DEMO_AUDIO_ORDERS,
  DEMO_DOWNLOAD_ORDERS,
  type DemoOrder,
} from './my-portal-demo-data';

export type PackDetailDownload = {
  id: number;
  name: string | null;
  remaining_downloads: number;
  expires_at: string | null;
  available: boolean;
};

export type PackDetailOrder = {
  id: string;
  product_title: string | null;
  product_cover?: string | null;
  product_type?: string | null;
  course_id?: number | null;
  paid_at: string | null;
  downloads: PackDetailDownload[];
  is_demo?: boolean;
};

export function isStreamableAudioName(name: string | null | undefined): boolean {
  return /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name ?? '');
}

export function findPackOrder(
  orders: PackDetailOrder[],
  orderId: string,
  kind: 'download' | 'audio',
): PackDetailOrder | undefined {
  return orders.find(order => {
    if (order.id !== orderId) {
      return false;
    }
    if (kind === 'audio') {
      return order.product_type === 'audio';
    }
    return (
      order.product_type !== 'course' &&
      order.product_type !== 'audio' &&
      !order.course_id
    );
  });
}

export function demoPackOrder(
  orderId: string,
  kind: 'download' | 'audio',
): PackDetailOrder | undefined {
  const pool: DemoOrder[] =
    kind === 'audio' ? DEMO_AUDIO_ORDERS : DEMO_DOWNLOAD_ORDERS;
  return pool.find(order => order.id === orderId);
}

export function remainingDownloads(order: PackDetailOrder): number {
  return order.downloads
    .filter(d => d.available)
    .reduce((sum, d) => sum + Math.max(0, d.remaining_downloads), 0);
}
