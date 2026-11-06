export interface CopyDraftIdentity {
  draftId: string;
  draftVersion: number;
}

export interface ProductCopyDraft {
  draft_id?: string;
  draft_version?: number;
  state?:
    | 'proposed'
    | 'reviewed'
    | 'applied'
    | 'discarded'
    | 'expired'
    | 'invalidated';
  title: string;
  description: string;
  source_fingerprint: string;
  local_title: string;
  local_description: string;
}

export function canUseProductCopyDraft(
  draft: ProductCopyDraft,
  currentTitle: string,
  currentDescription: string,
  editedDescription: string,
): boolean {
  return (
    currentTitle === draft.local_title &&
    currentDescription === draft.local_description &&
    /^[a-f0-9]{64}$/.test(draft.source_fingerprint) &&
    editedDescription.trim().length > 0 &&
    editedDescription.trim().length <= 5000 &&
    !/<[^>]*>|https?:\/\/|(?:javascript|data):/i.test(editedDescription)
  );
}
