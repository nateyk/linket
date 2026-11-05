import {parseEtbToCents, type BillingMode} from './product-create-flow';
import type {ProductType} from './product-type-picker';

/**
 * Required creation data only; optional samples and storefront placement
 * deliberately never block a product's readiness indicator.
 */
export type MissingProductRequirement = 'title' | 'files' | 'pricing';

export function missingProductRequirements(input: {
  title: string;
  filesCount: number;
  billing: BillingMode | null;
  price: string;
  type: ProductType;
}): MissingProductRequirement[] {
  const missing: MissingProductRequirement[] = [];
  if (!input.title.trim()) missing.push('title');
  if (input.type !== 'course' && input.filesCount === 0) missing.push('files');
  if (
    !input.billing ||
    (input.billing === 'paid' && (parseEtbToCents(input.price) ?? 0) <= 0)
  ) missing.push('pricing');
  return missing;
}

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
