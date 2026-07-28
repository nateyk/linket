import {apiClient, queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';

// LOGIN

export interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
  token_name: string;
}

export interface LoginResponse {
  bootstrapData: string;
  two_factor: false;
  url?: {
    intended?: string;
  };
}

export const loginOptions = () =>
  mutationOptions({
    mutationFn: (payload: LoginPayload) =>
      apiClient
        .post<LoginResponse | {two_factor: false}>('/auth/login', payload)
        .then(r => r.data),
  });

// SOCIAL LOGIN

export const connectSocialWithPasswordOptions = () =>
  mutationOptions({
    mutationFn: (payload: {password: string}) =>
      apiClient
        .post<{
          bootstrapData: string;
        }>(`/auth/social/connect-with-password`, payload)
        .then(r => r.data),
  });

export const disconnectSocialOptions = () =>
  mutationOptions({
    mutationFn: (payload: {service: string}) =>
      apiClient
        .post(`/auth/social/${payload.service}/disconnect`, payload)
        .then(r => r.data),
  });

// PASSWORD

export interface ResetPasswordPayload {
  email: string;
  password: string;
  password_confirmation: string;
  token: string;
}

export const resetPasswordOptions = () =>
  mutationOptions({
    mutationFn: (payload: ResetPasswordPayload) =>
      apiClient.post('/auth/reset-password', payload).then(r => r.data),
  });

export const sendResetPasswordEmailOptions = () =>
  mutationOptions({
    mutationFn: (payload: {email: string}) =>
      apiClient
        .post<{message: string}>('/auth/forgot-password', payload)
        .then(r => r.data),
  });

export const getPasswordConfirmationStatusOptions = () =>
  queryOptions<{confirmed: boolean}>({
    queryKey: ['password-confirmation-status'],
    staleTime: Infinity,
    queryFn: () =>
      apiClient.get('/auth/user/confirmed-password-status').then(r => r.data),
  });

export function setPasswordConfirmationStatus(confirmed: boolean) {
  queryClient.setQueryData(['password-confirmation-status'], {confirmed});
}

export interface ConfirmPasswordPayload {
  password: string;
}

export const confirmPasswordOptions = () =>
  mutationOptions({
    mutationFn: (payload: ConfirmPasswordPayload) =>
      apiClient.post('/auth/user/confirm-password', payload).then(r => r.data),
  });

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export const updatePasswordOptions = () =>
  mutationOptions({
    mutationFn: (payload: UpdatePasswordPayload) =>
      apiClient.put('/auth/user/password', payload).then(r => r.data),
  });

// EMAIL VERIFICATION

export const validateEmailVerificationOtpOptions = () =>
  mutationOptions({
    mutationFn: (payload: {code: string}) =>
      apiClient
        .post('/auth/validate-email-verification-otp', payload)
        .then(r => r.data),
  });

export const resendVerificationEmailOptions = () =>
  mutationOptions({
    mutationFn: (payload: {email: string}) =>
      apiClient
        .post('/auth/resend-email-verification', payload)
        .then(r => r.data),
  });

export const enableTwoFactorOptions = () =>
  mutationOptions({
    mutationFn: () =>
      apiClient.post('/auth/user/two-factor-authentication').then(r => r.data),
  });

// TWO FACTOR AUTHENTICATION

export const confirmTwoFactorOptions = () =>
  mutationOptions({
    mutationFn: (payload: {code: string}) =>
      apiClient
        .post('/auth/user/confirmed-two-factor-authentication', payload)
        .then(r => r.data),
  });

export const disableTwoFactorOptions = () =>
  mutationOptions({
    mutationFn: () =>
      apiClient
        .delete('/auth/user/two-factor-authentication')
        .then(r => r.data),
  });

export const regenerateTwoFactorCodesOptions = () =>
  mutationOptions({
    mutationFn: () =>
      apiClient.post('/auth/user/two-factor-recovery-codes').then(r => r.data),
  });

export const twoFactorChallengeOptions = () =>
  mutationOptions({
    mutationFn: (payload: {code?: string; recovery_code?: string}) =>
      apiClient.post('/auth/two-factor-challenge', payload).then(r => r.data),
  });

export const twoFactorQrCodeOptions = () =>
  queryOptions<{svg: string; secret: string}>({
    queryKey: ['two-factor-qr-code'],
    queryFn: () =>
      apiClient.get('/auth/user/two-factor/qr-code').then(r => r.data),
  });

export const completeTwoFactorChallengeOptions = () =>
  mutationOptions({
    mutationFn: (payload: {code?: string; recovery_code?: string}) =>
      apiClient
        .post('/auth/two-factor-challenge', payload)
        .then(r => r.data) as Promise<{
        bootstrapData: string;
        two_factor: false;
      }>,
  });
