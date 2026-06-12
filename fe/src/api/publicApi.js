import httpClient from './httpClient.js';

export function submitLeadCapture(payload) {
  return httpClient.post('/api/public/lead-capture', payload).then((response) => response.data);
}
