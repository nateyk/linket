import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (file: string) =>
  fs.readFileSync(path.resolve('common/foundation/resources/client/shadcn/dialog', file), 'utf8');

describe('dialog surfaces', () => {
  const dialog = read('dialog.tsx');
  const styles = read('dialog-base-styles.ts');

  test('the viewport never clips positioned content', () => {
    expect(styles).not.toContain('justify-center overflow-hidden');
  });

  test('only a filled footer rounds its bottom corners', () => {
    expect(dialog).not.toMatch(/gap-2 rounded-b-card px-6/);
    expect(dialog).toContain(
      "variant === 'muted' && 'rounded-b-card border-t bg-muted/50 pt-6'",
    );
  });
});
