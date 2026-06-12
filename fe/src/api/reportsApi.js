import httpClient from './httpClient.js';
import { appendQueryParams } from './queryHelpers.js';

function normalizeLeadSourceReportItem(item) {
  return {
    ...item,
    source: item.source ?? item.sourceName ?? '',
  };
}

export function getLeadsBySourceReport(params = {}) {
  return httpClient
    .get(appendQueryParams('/api/reports/leads-by-source', params))
    .then((response) => response.data.map(normalizeLeadSourceReportItem));
}

export function getPipelineSummaryReport(params = {}) {
  return httpClient
    .get(appendQueryParams('/api/reports/pipeline-summary', params))
    .then((response) => response.data);
}

export function getStageAgingReport(params = {}) {
  return httpClient
    .get(appendQueryParams('/api/reports/stage-aging', params))
    .then((response) => response.data);
}

export function getTasksSummaryReport(params = {}) {
  return httpClient
    .get(appendQueryParams('/api/reports/tasks-summary', params))
    .then((response) => response.data);
}
