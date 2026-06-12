import httpClient from './httpClient.js';

export function getLeadSources() {
  return httpClient.get('/api/lead-sources').then((response) => response.data);
}

export function createLeadSource(payload) {
  return httpClient.post('/api/lead-sources', payload).then((response) => response.data);
}
