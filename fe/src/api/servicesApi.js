import httpClient from './httpClient.js';

function normalizeService(service) {
  if (typeof service === 'string') {
    return {
      id: service,
      name: service,
      code: service.toLowerCase().replaceAll(' ', '_'),
      estimatedCost: null,
      isActive: true,
    };
  }

  return {
    ...service,
    estimatedCost:
      service.estimatedCost === undefined || service.estimatedCost === null
        ? null
        : Number(service.estimatedCost),
  };
}

export function getServices() {
  return httpClient.get('/api/services').then((response) => (response.data || []).map(normalizeService));
}

export function getServiceNames() {
  return getServices().then((services) => services.map((service) => service.name));
}

export function getAllServices() {
  return httpClient.get('/api/services/all').then((response) => (response.data || []).map(normalizeService));
}

export function createService(payload) {
  return httpClient.post('/api/services', payload).then((response) => normalizeService(response.data));
}

export function updateService(id, payload) {
  return httpClient.put(`/api/services/${id}`, payload).then((response) => normalizeService(response.data));
}

export function deleteService(id) {
  return httpClient.delete(`/api/services/${id}`).then((response) => response.data);
}
