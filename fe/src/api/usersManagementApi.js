import httpClient from './httpClient.js';

const dataImportPermission = {
  code: 'settings.data_import.manage',
  label: 'Manage data imports',
  group: 'Settings',
};

function ensureDataImportPermission(permissions) {
  const permissionList = Array.isArray(permissions) ? permissions : [];

  if (permissionList.some((permission) => permission.code === dataImportPermission.code)) {
    return permissionList;
  }

  return [...permissionList, dataImportPermission];
}

export function getUsers() {
  return httpClient.get('/api/users-management/users').then((response) => response.data || []);
}

export function createUser(payload) {
  return httpClient.post('/api/users-management/users', payload).then((response) => response.data);
}

export function updateUser(id, payload) {
  return httpClient.put(`/api/users-management/users/${id}`, payload).then((response) => response.data);
}

export function getRoles() {
  return httpClient.get('/api/users-management/roles').then((response) => response.data || []);
}

export function getPermissions() {
  return httpClient
    .get('/api/users-management/permissions')
    .then((response) => ensureDataImportPermission(response.data));
}

export function updateRolePermissions(roleCode, permissions) {
  return httpClient
    .put(`/api/users-management/roles/${roleCode}/permissions`, { permissions })
    .then((response) => response.data);
}
