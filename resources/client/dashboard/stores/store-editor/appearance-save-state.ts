/**
 * A successful HTTP response acknowledges only the Appearance snapshot that
 * was submitted. Editor controls remain editable while the request is pending:
 * later changes must keep Save enabled and the navigation guard active.
 *
 * The config is a JSON-serializable payload, not a mutable React element.
 */
export function appearanceWasEditedAfterSubmission(
  currentAppearance: unknown,
  submittedAppearance: unknown,
): boolean {
  return JSON.stringify(currentAppearance) !== JSON.stringify(submittedAppearance);
}
