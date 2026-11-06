import {describe, expect, test} from 'vitest';
import {appearanceWasEditedAfterSubmission} from './appearance-save-state';

describe('storefront Appearance saves are snapshot-specific', () => {
  const before = {
    bgConfig: {backgroundColor: '#ffffff', color: '#202020'},
    btnConfig: {radius: 'rounded-sm', shadow: 'none'},
    fontConfig: {family: 'Inter'},
  };

  test('acknowledges a matching submitted snapshot', () => {
    const submitted = structuredClone(before);
    expect(appearanceWasEditedAfterSubmission(before, submitted)).toBe(false);
  });

  test('keeps edits made to background while the save was in flight', () => {
    const submitted = structuredClone(before);
    const current = {...submitted, bgConfig: {...submitted.bgConfig, backgroundColor: '#192d4f'}};
    expect(appearanceWasEditedAfterSubmission(current, submitted)).toBe(true);
  });

  test('keeps later button radius and shadow edits unsaved', () => {
    const submitted = structuredClone(before);
    const current = {...submitted, btnConfig: {radius: 'rounded-full', shadow: 'strong'}};
    expect(appearanceWasEditedAfterSubmission(current, submitted)).toBe(true);
  });

  test('does not treat changes to the saved payload as newer edits', () => {
    const submitted = structuredClone(before);
    const current = structuredClone(before);
    expect(appearanceWasEditedAfterSubmission(current, submitted)).toBe(false);
  });
});
