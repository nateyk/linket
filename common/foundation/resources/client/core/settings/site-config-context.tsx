import type {NotificationListItemProps} from '@common/notifications/notification-list';
import React, {ComponentType, ReactNode} from 'react';

export interface AdConfig {
  slot: string;
  description: ReactNode;
  image: string;
}

export interface TagType {
  name: string;
  system?: boolean;
}

export interface CustomPageType {
  type: string;
  label: ReactNode;
}

export interface RoleType {
  type: string;
  label: ReactNode;
}

export interface HomepageOption {
  label: ReactNode;
  value: string;
}

export interface SiteConfigContextValue {
  auth?: {
    getUserProfileLink?: (user: {
      id: number | string;
      name: string | null;
    }) => string;
  };
  notifications: {
    renderMap?: Record<string, ComponentType<NotificationListItemProps>>;
  };
  roles?: {
    types?: RoleType[];
  };
  admin: {
    ads: AdConfig[];
  };
  demo?: {
    email?: string;
    password?: string;
  };
}

export const SiteConfigContext = React.createContext<SiteConfigContextValue>(
  null!,
);
