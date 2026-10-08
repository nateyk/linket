import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {Plugin} from 'vite';
import {defineConfig} from 'vitest/config';

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
  },
  test: {
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
    // Vitest 4 dropped environmentMatchGlobs: a test that renders opts into
    // jsdom with a `@vitest-environment` docblock, and picks up the stubs in
    // test-dom-setup.ts. Everything else stays on node, which is faster.
    setupFiles: ['resources/client/test-dom-setup.ts'],
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
      input: ['resources/client/main.tsx'],
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
