import {Badge} from '@shadcn/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {BadgeCheckIcon, ClockIcon, FileIcon, XCircleIcon} from 'lucide-react';

export type AdminDigitalProductStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'draft';

export type AdminDigitalProduct = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  status: AdminDigitalProductStatus;
  rejection_reason?: string | null;
  review_requested_at?: string | null;
  has_pending_update?: boolean;
  created_at?: string;
  creator?: {name: string; email: string};
  cover?: {url: string} | null;
  files?: Array<{id: number; name: string}>;
  reviews_count?: number;
  hidden_reviews_count?: number;
  type?: string;
};

export function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function ProductStatusBadge({
  status,
  hasPendingUpdate = false,
}: {
  status: AdminDigitalProductStatus;
  hasPendingUpdate?: boolean;
}) {
  if (status === 'approved' && hasPendingUpdate) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="positive" className="font-medium">
          <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
          <Trans message="Approved" />
        </Badge>
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
        >
          <ClockIcon className="size-3.5" aria-hidden="true" />
          <Trans message="Update" />
        </Badge>
      </div>
    );
  }
  if (status === 'approved') {
    return (
      <Badge variant="positive" className="font-medium">
        <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Approved" />
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive" className="font-medium">
        <XCircleIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Rejected" />
      </Badge>
    );
  }
  if (status === 'draft') {
    return (
      <Badge variant="secondary" className="font-medium">
        <FileIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Draft" />
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
    >
      <ClockIcon className="size-3.5" aria-hidden="true" />
      <Trans message="Pending" />
    </Badge>
  );
}
