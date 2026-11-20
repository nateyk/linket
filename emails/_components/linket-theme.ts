import { pixelBasedPreset, type TailwindConfig } from 'react-email';

export const linketEmailTailwindConfig: TailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: '#0049cc',
        ink: '#3f3f3f',
        muted: '#8b8b8b',
        page: '#f5f5f5',
        card: '#ffffff',
        line: '#e5e5e5',
      },
    },
  },
};