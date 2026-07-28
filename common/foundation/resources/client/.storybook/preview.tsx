import {Tooltip} from '@shadcn/tooltip/tooltip';
import addonA11y from '@storybook/addon-a11y';
import addonDocs from '@storybook/addon-docs';
import {definePreview} from '@storybook/react-vite';
import {useLayoutEffect} from 'react';
import './storybook.css';

let isModifyingDocument = false;

export default definePreview({
  parameters: {
    layout: 'none',
    backgrounds: {
      disable: true,
    },
  },

  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        dynamicTitle: true,
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          {
            value: 'light',
            title: 'Light theme',
          },
          {
            value: 'dark',
            title: 'Dark theme',
          },
        ],
      },
    },
    radius: {
      description: 'Global border radius for components',
      defaultValue: 'lg',
      toolbar: {
        title: 'Radius',
        icon: 'circlehollow',
        items: [
          {
            value: 'none',
            title: 'Square radius',
          },
          {
            value: 'sm',
            title: 'Small radius',
          },
          {
            value: 'md',
            title: 'Medium radius',
          },
          {
            value: 'lg',
            title: 'Large radius',
          },
        ],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (Story, {globals}) => {
      useLayoutEffect(() => {
        if (isModifyingDocument) return;
        isModifyingDocument = true;
        ['light', 'dark'].map(theme =>
          document.documentElement.classList.remove(theme),
        );
        ['none', 'sm', 'md', 'lg'].map(radius =>
          document.documentElement.classList.remove(`radius-${radius}`),
        );
        document.documentElement.classList.add(globals.theme);
        document.documentElement.classList.add(`radius-${globals.radius}`);
        isModifyingDocument = false;
      }, [globals.theme, globals.radius]);

      return (
        <Tooltip.Provider>
          <div className="flex size-full items-center justify-center bg-background p-8">
            <Story />
          </div>
        </Tooltip.Provider>
      );
    },
  ],

  addons: [addonDocs(), addonA11y()],
});
