import httpClient from './httpClient.js';
import { getRefreshToken } from '../features/auth/authSession.js';

function extractAccessToken(payload) {
  return (
    payload?.accessToken ??
    payload?.token ??
    payload?.tokens?.accessToken ??
    null
  );
}

function extractRefreshToken(payload) {
  return (
    payload?.refreshToken ??
    payload?.tokens?.refreshToken ??
    null
  );
}

export async function login(credentials) {
  const response = await httpClient.post('/api/auth/login', credentials);

  return {
    ...response.data,
    accessToken: extractAccessToken(response.data),
    refreshToken: extractRefreshToken(response.data),
  };
}

export async function refresh() {
  const response = await httpClient.post('/api/auth/refresh', {
    refreshToken: getRefreshToken() ?? '',
  });

  return {
    ...response.data,
    accessToken: extractAccessToken(response.data),
    refreshToken: extractRefreshToken(response.data),
  };
}

export async function logout() {
  const response = await httpClient.post('/api/auth/logout', {
    refreshToken: getRefreshToken() ?? '',
  });

  return response.data;
}

export async function getMe() {
  const response = await httpClient.get('/api/auth/me');
  return response.data;
}
