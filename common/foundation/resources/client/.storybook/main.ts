import {defineMain} from '@storybook/react-vite/node';

export default defineMain({
  stories: [
    '../shadcn/**/*.stories.tsx',
    '../shadcn/**/*.mdx',
    // App-level stories. Resolved from this config dir
    // (common/foundation/resources/client/.storybook) up to the repo root.
    '../../../../../resources/client/**/*.stories.tsx',
  ],
  staticDirs: ['../public'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-mcp',
    '@storybook/addon-vitest',
    'msw-storybook-addon',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    // `react-docgen` avoids the vite-plugin-react-docgen-typescript
    // "not included in the active TypeScript project" warning on preview.tsx.
    reactDocgen: 'react-docgen',
  },
  viteFinal: async viteConfig => {
    return {
      ...viteConfig,
      resolve: {
        ...viteConfig.resolve,
        preserveSymlinks: true,
        tsconfigPaths: true,
      },
    };
  },
});
