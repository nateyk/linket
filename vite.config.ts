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
    ],
    environment: 'node',
    globals: true,
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
