import {ComponentType, createContext, ReactNode} from 'react';

export type CustomSections = Record<
  string,
  {
    label: ReactNode;
    component: ComponentType<{index: number}>;
  }
>;

export type LandingPageSettingsContextValue = {
  customSections?: CustomSections;
  heroSettings?: ComponentType<{formPrefix: string; index: number}>;
};

export const LandingPageSettingsContext =
  createContext<LandingPageSettingsContextValue>(null!);
