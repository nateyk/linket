import {defineMain} from '@storybook/react-vite/node';

export default defineMain({
  stories: ['../shadcn/**/*.stories.tsx', '../shadcn/**/*.mdx'],
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
