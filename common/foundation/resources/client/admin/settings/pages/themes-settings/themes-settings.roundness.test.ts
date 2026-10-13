import fs from 'node:fs';
import {describe, expect, test} from 'vitest';
import {roundnessOptions} from './theme-constants';

// The admin "Corner roundness" control used to offer none|sm|md|default; the
// middle two were pulled because they made inputs read as buttons. "Round"
// (sm) comes back as a legitimate theme option (per the design brief), retuned
// in common-tailwind.css so fields stay tighter than buttons.
describe('admin theme roundness options', () => {
  test('offers Square, Round and the default step', () => {
    expect(roundnessOptions.map(option => option.value)).toEqual([
      'none',
      'sm',
      'default',
    ]);
  });

  test('labels the middle step "Round" and the default step "Default"', () => {
    const source = fs.readFileSync(
      'common/foundation/resources/client/admin/settings/pages/themes-settings/theme-constants.tsx',
      'utf8',
    );
    expect(source).toContain('message="Round"');
    expect(source).toContain('message="Default"');
    // "Full" was a mislabel: `default` remaps nothing, it is the standard
    // three-radius system, not a full-round theme.
    expect(source).not.toContain('message="Full"');
  });
});
