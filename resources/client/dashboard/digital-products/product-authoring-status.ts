/**
 * Interpret creator-visible review state using the explicit private API flag.
 * Approved items with pending updates are still approved, never drafts.
 */
export type ProductReviewState =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'approved_update_review'
  | 'rejected'
  | 'archived';

export function resolveProductReviewState(
  status: string,
  hasPendingUpdate = false,
): ProductReviewState {
  if (status === 'approved' && hasPendingUpdate) {
    return 'approved_update_review';
  }
  if (
    status === 'approved' ||
    status === 'pending_approval' ||
    status === 'rejected' ||
    status === 'archived'
  ) {
    return status;
  }
  return 'draft';
}
