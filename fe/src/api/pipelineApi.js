import httpClient from './httpClient.js';

function normalizeStage(stage) {
  return {
    ...stage,
    order: stage.order ?? stage.sortOrder ?? 0,
    rottingThresholdHours: stage.rottingThresholdHours ?? 168,
  };
}

function toStagePayload(payload) {
  return {
    ...payload,
    sortOrder: payload.sortOrder ?? payload.order ?? 0,
  };
}

export function getPipelineStages() {
  return httpClient
    .get('/api/pipeline/stages')
    .then((response) => response.data.map(normalizeStage));
}

export function createPipelineStage(payload) {
  return httpClient
    .post('/api/pipeline/stages', toStagePayload(payload))
    .then((response) => normalizeStage(response.data));
}

export function updatePipelineStage(id, payload) {
  return httpClient
    .put(`/api/pipeline/stages/${id}`, toStagePayload(payload))
    .then((response) => normalizeStage(response.data));
}

export function deletePipelineStage(id) {
  return httpClient.delete(`/api/pipeline/stages/${id}`).then((response) => response.data);
}

export function reorderPipelineStages(payload) {
  const stages = payload.stages || (payload.stageIds || []).map((id, index) => ({
    id,
    sortOrder: index + 1,
  }));

  return httpClient
    .put('/api/pipeline/stages/reorder', { stages })
    .then((response) => response.data.map(normalizeStage));
}
