import httpClient from './httpClient.js';

export function getAutomationRules() {
  return httpClient.get('/api/automation/rules').then((response) => response.data);
}

export function createAutomationRule(payload) {
  return httpClient.post('/api/automation/rules', payload).then((response) => response.data);
}

export function getAutomationRuleById(id) {
  return httpClient.get(`/api/automation/rules/${id}`).then((response) => response.data);
}

export function updateAutomationRule(id, payload) {
  return httpClient.put(`/api/automation/rules/${id}`, payload).then((response) => response.data);
}

export function deleteAutomationRule(id) {
  return httpClient.delete(`/api/automation/rules/${id}`).then((response) => response.data);
}
