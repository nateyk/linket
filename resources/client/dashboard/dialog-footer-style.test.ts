import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

// T6 (nested-cards follow-up): these seven dialogs still painted the muted
// footer strip (`border-t bg-muted/50 pt-6`) — a card inside the dialog panel
// (DESIGN.md "Don't nest a card inside a card"). The footer is an action row
// and must render flat on the panel, exactly like the product dialog
// precedent, with caller `py-4` supplying the spacing muted's `pt-6` used to.
const files = [
  'resources/client/dashboard/links/dialogs/create-link-dialog.tsx',
  'resources/client/dashboard/links/dialogs/create-multiple-links-dialog.tsx',
  'resources/client/dashboard/qr-codes/create-qr-code-dialog.tsx',
  'resources/client/dashboard/stores/store-editor/biolink-settings-dialog.tsx',
  'resources/client/dashboard/stores/store-editor/content/links/create-biolink-link-dialog.tsx',
  'resources/client/dashboard/stores/store-editor/content/links/update-biolink-link-dialog.tsx',
  'resources/client/admin/digital-products/admin-payment-activity-page.tsx',
];

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), 'utf8');
}

describe('flat dialog footers', () => {
  test.each(files)('%s has no muted Dialog.Footer strip', file => {
    expect(read(file)).not.toMatch(
      /<Dialog\.Footer[^>]*variant=["']muted["']/,
    );
  });

  // Removing `variant="muted"` drops its `pt-6`, so every one of these footers
  // must carry its own caller `py-*` class or the action row would collapse
  // against the body above it.
  test.each(files)('%s keeps caller py spacing on the footer', file => {
    expect(read(file)).toMatch(/<Dialog\.Footer[^>]*className="[^"]*py-/);
  });
});
