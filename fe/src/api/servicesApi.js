import httpClient from './httpClient.js';

export function getServices() {
  return httpClient.get('/api/services').then((response) => response.data || []);
}
