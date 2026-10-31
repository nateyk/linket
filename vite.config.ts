import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {Plugin} from 'vite';
import {defineConfig} from 'vitest/config';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const storybookConfigDir = path.join(
  dirname,
  'common/foundation/resources/client/.storybook',
);

const unitTestProject = {
  extends: true,
  test: {
    name: 'unit',
    include: [
      'resources/client/**/*.test.ts',
      'resources/client/**/*.test.tsx',
      'tests/js/**/*.test.ts',
      'tests/js/**/*.test.tsx',
      'common/foundation/resources/client/**/*.test.ts',
      'common/foundation/resources/client/**/*.test.tsx',
    ],
    environment: 'node',
    globals: true,
    // Vitest 4 dropped environmentMatchGlobs: a test that renders opts
    // into jsdom with a `@vitest-environment` docblock, and picks up the
    // stubs in test-dom-setup.ts. Everything else stays on node.
    setupFiles: ['resources/client/test-dom-setup.ts'],
  },
};

function storybookBrowserTestProject():
  | typeof unitTestProject
  | undefined {
  try {
    const {storybookTest} = require(
      '@storybook/addon-vitest/vitest-plugin',
    );
    const {playwright} = require('@vitest/browser-playwright');

    return {
      extends: true,
      plugins: [
        storybookTest({
          configDir: storybookConfigDir,
          storybookScript: 'npm run storybook -- --ci',
          tags: {
            include: ['ai-generated'],
          },
        }),
      ],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          provider: playwright({}),
          headless: true,
          instances: [{browser: 'chromium'}],
        },
        setupFiles: [path.join(storybookConfigDir, 'vitest.setup.ts')],
      },
    };
  } catch {
    return undefined;
  }
}

// override laravel plugin base option (from absolute to relative to html base tag)
function basePath(): Plugin {
  return {
    name: 'test',
    enforce: 'post',
    config: () => {
      return {
        base: '',
      };
    },
  };
}

function isIconsChunk(id: string): boolean {
  const isLucideIcon = id.includes('lucide-react/');
  const isUiIcon = id.includes('ui/library/icons/');
  const isSocialIcon = id.includes('ui/library/icons/social/');
  return isLucideIcon || (isUiIcon && !isSocialIcon);
}

export default defineConfig({
  base: '',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    cors: true,
  },
  resolve: {
    preserveSymlinks: true,
    tsconfigPaths: true,
    // tests/js is outside tsconfig.json's include, so tsconfigPaths alone
    // does not resolve its application imports in Vitest. Keep these aliases
    // aligned with tsconfig.json for both unit tests and production builds.
    alias: {
      '@app': path.join(dirname, 'resources/client'),
      '@common': path.join(dirname, 'common/foundation/resources/client'),
    },
  },
  test: {
    projects: (() => {
      const storybookProject = storybookBrowserTestProject();

      return storybookProject
        ? [unitTestProject, storybookProject]
        : [unitTestProject];
    })(),
  },
  build: {
    sourcemap: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              test: isIconsChunk,
              name: 'icons',
            },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    laravel({
      input: [
        'resources/client/main.tsx',
        'modules/livechat/resources/client/widget/widget-entry.tsx',
      ],
      refresh: false,
    }),
    basePath(),
    replace({
      preventAssignment: true,
      __SENTRY_DEBUG__: false,
      "import { URL } from 'url'": false,
    }),
  ],
});
