import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'common/foundation/resources/client/notifications/notifications-dialog.tsx',
  ),
  'utf8',
);

describe('NotificationsDialog error state', () => {
  test('shows retry UI when the notifications query fails', () => {
    expect(source).toContain('isError');
    expect(source).toContain("Couldn't load notifications.");
    expect(source).toContain('refetch');
  });
});
