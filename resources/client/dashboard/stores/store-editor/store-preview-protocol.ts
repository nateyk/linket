/**
 * The store editor's phone preview is the real public page in an iframe
 * (?preview=1). Data drafts flow as `linket:store-preview` payloads; this
 * module defines the second channel: which section of the preview page the
 * editor's current tab maps to (A-06).
 *
 * Both ends import from here, so the message shape and its validation have
 * exactly one definition.
 */
export const PREVIEW_TAB_MESSAGE = 'linket:store-preview-tab';

/** Sections of the preview page's mobile bottom nav. */
export type StorePreviewSection = 'profile' | 'products' | 'about';

/** Editor tabs that can drive the preview (insights deliberately cannot). */
export type StorePreviewEditorTab = 'content' | 'about' | 'appearance';

export function isStorePreviewSection(
  value: unknown,
): value is StorePreviewSection {
  return value === 'profile' || value === 'products' || value === 'about';
}

export function isStorePreviewEditorTab(
  value: unknown,
): value is StorePreviewEditorTab {
  return value === 'content' || value === 'about' || value === 'appearance';
}
