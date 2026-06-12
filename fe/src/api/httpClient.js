import axios from 'axios';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
} from '../features/auth/authSession.js';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let refreshPromise = null;

function extractAccessToken(payload) {
  return (
    payload?.accessToken ??
    payload?.token ??
    payload?.tokens?.accessToken ??
    payload?.data?.accessToken ??
    null
  );
}

function extractRefreshToken(payload) {
  return (
    payload?.refreshToken ??
    payload?.tokens?.refreshToken ??
    payload?.data?.refreshToken ??
    null
  );
}

async function refreshAccessToken() {
  const currentRefreshToken = getRefreshToken();

  if (!currentRefreshToken) {
    throw new Error('No refresh token is available.');
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${baseURL}/api/auth/refresh`,
        {
          refreshToken: currentRefreshToken,
        },
        {
          withCredentials: true,
        },
      )
      .then((response) => {
        const nextToken = extractAccessToken(response.data);
        const nextRefreshToken = extractRefreshToken(response.data);

        if (!nextToken) {
          throw new Error('Refresh token response did not include an access token.');
        }

        setAuthSession({
          accessToken: nextToken,
          refreshToken: nextRefreshToken,
        });

        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

const httpClient = axios.create({
  baseURL,
  withCredentials: true,
});

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        const nextToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return httpClient(originalRequest);
      } catch (refreshError) {
        clearAuthSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default httpClient;
