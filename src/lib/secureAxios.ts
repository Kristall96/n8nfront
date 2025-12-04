// src/lib/secureAxios.ts
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { getDeviceInfo } from './deviceInfo';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true, // send super_admin_refresh cookie
});

export type SuperAdminRefreshResponse = {
  accessToken: string;
  user: {
    id: string;
    role: 'super_admin';
  };
};

type StepUpResponse = {
  stepUp?: boolean;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
};

// extend axios request config with our _retry flag
type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let accessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

export const tokenBridge = {
  setAccessToken(token: string | null) {
    accessToken = token;
  },
  getAccessToken() {
    return accessToken;
  },
};

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes('/auth/super-admin/login') ||
    url.includes('/auth/super-admin/refresh') ||
    url.includes('/auth/super-admin/mfa') ||
    url.includes('/auth/super-admin/step-up')
  );
};

// -------- request interceptor: attach bearer + device headers --------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenBridge.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach device identity for risk/sessions
  if (typeof window !== 'undefined' && config.headers) {
    const { deviceId, deviceLabel } = getDeviceInfo();

    if (deviceId) {
      (config.headers as Record<string, string>)['x-device-id'] = deviceId;

      if (deviceLabel) {
        (config.headers as Record<string, string>)['x-device-label'] = deviceLabel;
      }
    }
  }

  return config;
});

// -------- response interceptor: handle step-up + 401 → refresh --------
api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    // only handle axios errors
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const axiosErr = error as AxiosError<unknown>;
    const { response, config } = axiosErr;
    const originalRequest = config as RetriableRequestConfig;

    // if there is no response (network error etc.), just bubble up
    if (!response) {
      return Promise.reject(error);
    }

    // STEP-UP: 403 with { stepUp: true } → redirect to /god/step-up
    if (response.status === 403 && typeof response.data === 'object' && response.data !== null) {
      const data = response.data as StepUpResponse;

      if (data.stepUp) {
        if (typeof window !== 'undefined') {
          // matches src/app/(god)/god/step-up/page.tsx
          window.location.href = '/god/step-up';
        }
        return Promise.reject(error);
      }
    }

    // only care about 401s for refresh logic
    if (response.status !== 401) {
      return Promise.reject(error);
    }

    const url = originalRequest.url;

    // Do NOT try refresh for auth endpoints themselves
    if (isAuthEndpoint(url)) {
      return Promise.reject(error);
    }

    // avoid infinite retry loop
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // if a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((newToken) => {
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          resolve(api(originalRequest as AxiosRequestConfig));
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await api.post<SuperAdminRefreshResponse>('/auth/super-admin/refresh', {});

      tokenBridge.setAccessToken(data.accessToken);

      // retry queued requests
      refreshQueue.forEach((cb) => cb(data.accessToken));
      refreshQueue = [];
      isRefreshing = false;

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      }

      return api(originalRequest as AxiosRequestConfig);
    } catch (refreshErr) {
      tokenBridge.setAccessToken(null);
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      isRefreshing = false;

      return Promise.reject(refreshErr);
    }
  },
);

export default api;
