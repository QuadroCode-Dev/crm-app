import httpClient from './httpClient.js';
import { appendQueryParams } from './queryHelpers.js';

function normalizePagedResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data.map(normalizeTask),
      total: data.length,
      page: 1,
      pageSize: data.length,
    };
  }

  return {
    ...data,
    items: (data?.items || []).map(normalizeTask),
    total: data?.total ?? data?.totalCount ?? 0,
  };
}

function normalizeTask(task) {
  if (!task) {
    return task;
  }

  return {
    ...task,
    assignedUserId: task.assignedUserId ?? task.assignedToUserId ?? '',
    assignedUserName: task.assignedUserName ?? task.assignedToUserFullName ?? '',
    dueDateUtc: task.dueDateUtc ?? task.dueAtUtc ?? null,
    isCompleted:
      task.isCompleted ?? (task.status === 'Completed' || task.status === 'Done' || Boolean(task.completedAtUtc)),
  };
}

function toTaskQuery(params) {
  const { dueDateFrom, dueDateTo, ...rest } = params;

  return {
    ...rest,
    dueFromUtc: dueDateFrom || params.dueFromUtc || '',
    dueToUtc: dueDateTo || params.dueToUtc || '',
  };
}

function toTaskPayload(payload) {
  const { assignedUserId, dueDateUtc, ...rest } = payload;

  return {
    ...rest,
    assignedToUserId: payload.assignedToUserId || assignedUserId || null,
    dueAtUtc: payload.dueAtUtc || dueDateUtc || null,
  };
}

export function getTasks(params = {}) {
  return httpClient
    .get(appendQueryParams('/api/tasks', toTaskQuery(params)))
    .then((response) => normalizePagedResponse(response.data));
}

export function createTask(payload) {
  return httpClient
    .post('/api/tasks', toTaskPayload(payload))
    .then((response) => normalizeTask(response.data));
}

export function getTaskById(id) {
  return httpClient.get(`/api/tasks/${id}`).then((response) => normalizeTask(response.data));
}

export function updateTask(id, payload) {
  return httpClient
    .put(`/api/tasks/${id}`, toTaskPayload(payload))
    .then((response) => normalizeTask(response.data));
}

export function completeTask(id) {
  return httpClient
    .patch(`/api/tasks/${id}/complete`)
    .then((response) => normalizeTask(response.data));
}

export function deleteTask(id) {
  return httpClient.delete(`/api/tasks/${id}`).then((response) => response.data);
}
