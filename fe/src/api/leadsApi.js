import httpClient from './httpClient.js';
import { appendQueryParams } from './queryHelpers.js';

function normalizePagedResponse(data) {
  return {
    ...data,
    items: (data?.items || []).map(normalizeLead),
    total: data?.total ?? data?.totalCount ?? 0,
  };
}

function normalizeLead(lead) {
  if (!lead) {
    return lead;
  }

  return {
    ...lead,
    contactSalutation: lead.contactSalutation ?? lead.contact?.salutation ?? '',
    contactName: lead.contactName ?? lead.contactFullName ?? '',
    email: lead.email ?? lead.contactEmail ?? '',
    phone: lead.phone ?? lead.contactPhone ?? '',
    source: lead.source ?? lead.leadSourceName ?? '',
    sourceId: lead.sourceId ?? lead.leadSourceId ?? lead.source ?? '',
    stageId: lead.stageId ?? lead.currentPipelineStageId ?? '',
    stageName: lead.stageName ?? lead.currentPipelineStageName ?? '',
    ownerName: lead.ownerName ?? lead.ownerUserFullName ?? '',
  };
}

function toLeadQuery(params) {
  const { source, stage, owner, ...rest } = params;

  return {
    ...rest,
    sourceId: source || params.sourceId || '',
    stageId: stage || params.stageId || '',
    ownerUserId: owner || params.ownerUserId || '',
  };
}

function toLeadPayload(payload) {
  const {
    contactName,
    source,
    sourceId,
    stageId,
    stage,
    ...rest
  } = payload;

  return removeEmptyGuidValues({
    ...rest,
    contactName: contactName || undefined,
    leadSourceId: payload.leadSourceId || sourceId || source,
    currentPipelineStageId: payload.currentPipelineStageId || stageId || stage,
  });
}

function toStagePayload(payload) {
  return removeEmptyGuidValues({
    pipelineStageId: payload.pipelineStageId || payload.stageId,
  });
}

function removeEmptyGuidValues(payload) {
  const guidFields = [
    'contactId',
    'leadSourceId',
    'currentPipelineStageId',
    'ownerUserId',
    'pipelineStageId',
  ];

  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key, value]) => !(guidFields.includes(key) && value === ''),
    ),
  );
}

export function getLeads(params = {}) {
  return httpClient
    .get(appendQueryParams('/api/leads', toLeadQuery(params)))
    .then((response) => normalizePagedResponse(response.data));
}

export function createLead(payload) {
  return httpClient
    .post('/api/leads', toLeadPayload(payload))
    .then((response) => normalizeLead(response.data));
}

export function getLeadById(id) {
  return httpClient.get(`/api/leads/${id}`).then((response) => normalizeLead(response.data));
}

export function updateLead(id, payload) {
  return httpClient
    .put(`/api/leads/${id}`, toLeadPayload(payload))
    .then((response) => normalizeLead(response.data));
}

export function deleteLead(id) {
  return httpClient.delete(`/api/leads/${id}`).then((response) => response.data);
}

export function updateLeadStage(id, payload) {
  return httpClient
    .patch(`/api/leads/${id}/stage`, toStagePayload(payload))
    .then((response) => normalizeLead(response.data));
}

export function getLeadTimeline(id) {
  return httpClient
    .get(`/api/leads/${id}/timeline`)
    .then((response) =>
      response.data.map((item) => ({
        ...item,
        metadata: item.metadata ?? (item.metadataJson ? JSON.parse(item.metadataJson) : {}),
        user: item.user ?? {
          fullName: item.userFullName,
          email: item.userEmail,
        },
      })),
    );
}

export function getLeadDuplicates(id) {
  return httpClient.get(`/api/leads/${id}/duplicates`).then((response) => response.data);
}

export function getLeadStageTimer(id) {
  return httpClient.get(`/api/leads/${id}/stage-timer`).then((response) => response.data);
}
