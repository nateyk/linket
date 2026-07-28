import {getSettingsPreviewMode} from '@common/admin/settings/preview/use-settings-preview-mode';
import {apiErrorStatusIs} from '@common/http/errors/parsed-api-error';
import {getEchoSocketId} from '@common/http/get-echo-socket-id';
import {QueryClient} from '@tanstack/react-query';
import {mergeBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {isAbsoluteUrl} from '@ui/utils/urls/is-absolute-url';
import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

const globalHeaders: Record<string, string> = {};
export function addGlobalHeaderToApiClient(header: string, value: string) {
  globalHeaders[header.trim()] = value.trim();
}
export function getApiClientGlobalHeaders() {
  return globalHeaders;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (failureCount, err) =>
        !apiErrorStatusIs(err, 401) &&
        !apiErrorStatusIs(err, 403) &&
        !apiErrorStatusIs(err, 404) &&
        failureCount < 2,
    },
  },
});

export const apiClient = axios.create({
  adapter: 'fetch',
  withCredentials: true,
  responseType: 'json',
  headers: {
    common: {
      Accept: 'application/json',
    },
  },
});

const internalEndpoints = ['auth', 'secure', 'log-viewer', 'horizon'];
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const normalizedUrl = config.url?.replace(/^\//, '');
  if (
    !internalEndpoints.some(endpoint => normalizedUrl?.startsWith(endpoint)) &&
    !isAbsoluteUrl(normalizedUrl) &&
    !normalizedUrl?.startsWith('api/v1/')
  ) {
    config.url = `api/v1/${normalizedUrl}`;
  }

  const method = config.method?.toUpperCase();

  Object.entries(getApiClientGlobalHeaders()).forEach(([key, value]) => {
    config.headers.set(key, value);
  });

  const echoSocketId = getEchoSocketId();
  if (echoSocketId) {
    config.headers.set('X-Socket-ID', echoSocketId);
  }

  const settingsPreviewMode = getSettingsPreviewMode();
  if (settingsPreviewMode.isInsideSettingsPreview) {
    config.headers.set('X-Settings-Preview', 'true');
  }

  // override PUT, DELETE, PATCH methods, they might not be supported on the backend
  if (method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    config.headers.set('X-HTTP-Method-Override', method);
    config.method = 'POST';
    config.params = {
      ...config.params,
      _method: method,
    };
  }

  // use xhr adapter for upload progress, becuase fetch one is not supported by all browsers.
  if (config.onUploadProgress) {
    config.adapter = 'xhr';
  }

  return config;
});

export const orvalApiFetch = async <T>(
  {
    url,
    method,
    params,
    headers,
    data,
  }: {
    url: string;
    method: AxiosRequestConfig['method'];
    params?: AxiosRequestConfig['params'];
    headers?: AxiosRequestConfig['headers'];
    data?: AxiosRequestConfig['data'];
    responseType?: AxiosRequestConfig['responseType'];
  },
  options?: AxiosRequestConfig,
): Promise<T> => {
  const response = await apiClient.request<T>({
    url,
    method,
    data,
    params,
    headers,
    ...options,
  });

  if (response.status === 204) {
    return null as T;
  }

  return response.data;
};

const CSRF_REFRESH_COOLDOWN_MS = 60000; // 1 minute
let csrfRefreshPromise: Promise<void> | null = null;
let lastCsrfRefreshTime = 0;

async function refreshCsrfToken(): Promise<void> {
  const now = Date.now();
  if (now - lastCsrfRefreshTime < CSRF_REFRESH_COOLDOWN_MS) {
    return;
  }

  if (csrfRefreshPromise) {
    return csrfRefreshPromise;
  }

  lastCsrfRefreshTime = now;

  csrfRefreshPromise = axios
    .get('csrf-token', {withCredentials: true})
    .then(r => {
      mergeBootstrapData({csrf_token: r.data.csrf_token});
    })
    .finally(() => {
      csrfRefreshPromise = null;
    });

  return csrfRefreshPromise;
}

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _csrfRetry?: boolean;
    };

    if (
      error.response?.status === 419 &&
      originalRequest &&
      !originalRequest._csrfRetry
    ) {
      const now = Date.now();
      if (
        now - lastCsrfRefreshTime < CSRF_REFRESH_COOLDOWN_MS &&
        lastCsrfRefreshTime > 0
      ) {
        return Promise.reject(error);
      }

      originalRequest._csrfRetry = true;

      try {
        await refreshCsrfToken();
        return apiClient(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
