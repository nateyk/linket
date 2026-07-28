import {Subscription} from '@app/gen/schemas/subscription';
import {Permission} from '@common/auth/permission';
import {SocialProfile} from '@common/auth/social-profile';

export const USER_MODEL = 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  image?: string | null;
  email_verified_at: string;
  permissions?: Permission[];
  language?: string;
  country?: string;
  timezone?: string;
  password: string;
  created_at: string;
  updated_at: string;
  subscription?: Omit<Subscription, 'user'>[];
  roles?: {id: number; name: string}[];
  social_profiles: SocialProfile[];
  has_password: boolean;
  unread_notifications_count?: number;
  card_last_four?: number;
  card_brand?: string;
  card_expires?: string;
  model_type: typeof USER_MODEL;
  banned_at?: string;
  followed_users?: Omit<User, 'followed_users' | 'followers'>[];
  followers_count?: number;
  followed_users_count?: number;
  followers?: Omit<User, 'followed_users' | 'followers'>[];
  latest_user_session?: {
    id: number;
    updated_at: string;
  };
  bans?: {
    id: number;
    comment: string;
    expired_at?: string;
  }[];
  two_factor_confirmed_at?: string;
  two_factor_recovery_codes?: string[];
}
