import {defineMain} from '@storybook/react-vite/node';

export default defineMain({
  stories: [
    '../shadcn/**/*.stories.tsx',
    '../shadcn/**/*.mdx',
    // App-level stories. Resolved from this config dir
    // (common/foundation/resources/client/.storybook) up to the repo root.
    '../../../../../resources/client/**/*.stories.tsx',
  ],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-mcp',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
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
