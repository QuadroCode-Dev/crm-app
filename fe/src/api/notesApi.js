import httpClient from './httpClient.js';

function normalizeNote(note) {
  return {
    ...note,
    content: note.content ?? note.body ?? '',
    createdByName: note.createdByName ?? note.userFullName ?? '',
  };
}

function toNotePayload(payload) {
  return {
    body: payload.body ?? payload.content ?? '',
  };
}

export function getLeadNotes(leadId) {
  return httpClient
    .get(`/api/leads/${leadId}/notes`)
    .then((response) => response.data.map(normalizeNote));
}

export function createLeadNote(leadId, payload) {
  return httpClient
    .post(`/api/leads/${leadId}/notes`, toNotePayload(payload))
    .then((response) => normalizeNote(response.data));
}

export function updateNote(id, payload) {
  return httpClient
    .put(`/api/notes/${id}`, toNotePayload(payload))
    .then((response) => normalizeNote(response.data));
}

export function deleteNote(id) {
  return httpClient.delete(`/api/notes/${id}`).then((response) => response.data);
}
