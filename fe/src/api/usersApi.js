import httpClient from './httpClient.js';

export function getActiveUsers() {
  return httpClient.get('/api/users').then((response) => response.data || []);
}
