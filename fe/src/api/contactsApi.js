import httpClient from './httpClient.js';
import { appendQueryParams } from './queryHelpers.js';

export function getContacts(params = {}) {
  return httpClient
    .get(appendQueryParams('/api/contacts', params))
    .then((response) => response.data);
}

export function createContact(payload) {
  return httpClient.post('/api/contacts', payload).then((response) => response.data);
}

export function getContactById(id) {
  return httpClient.get(`/api/contacts/${id}`).then((response) => response.data);
}

export function updateContact(id, payload) {
  return httpClient.put(`/api/contacts/${id}`, payload).then((response) => response.data);
}

export function deleteContact(id) {
  return httpClient.delete(`/api/contacts/${id}`).then((response) => response.data);
}
