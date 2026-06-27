import dayjs from 'dayjs';
import { http, HttpResponse } from 'msw';
import { baseMockState } from './crmMockData.js';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MOCK_STATE_STORAGE_KEY = 'crm.mocks.state';

let state = createInitialState();

function canPersistMockState() {
  return (
    typeof window !== 'undefined' &&
    import.meta.env.DEV &&
    import.meta.env.MODE !== 'test' &&
    import.meta.env.VITE_ENABLE_API_MOCKS === 'true'
  );
}

function getPersistedState() {
  if (!canPersistMockState()) {
    return null;
  }

  const value = window.localStorage.getItem(MOCK_STATE_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function persistState() {
  if (!canPersistMockState()) {
    return;
  }

  const persistedState = structuredClone(state);
  delete persistedState.auth;
  window.localStorage.setItem(MOCK_STATE_STORAGE_KEY, JSON.stringify(persistedState));
}

function createInitialState() {
  const persistedState = getPersistedState();

  return {
    ...structuredClone(baseMockState),
    ...(persistedState || {}),
  };
}

export function resetMockState() {
  state = createInitialState();
}

function isAuthorized(request) {
  const authHeader = request.headers.get('authorization');
  return (
    state.auth.isAuthenticated ||
    authHeader === `Bearer ${state.auth.accessToken}`
  );
}

function unauthorizedResponse() {
  return HttpResponse.json(
    {
      message: 'Unauthorized',
    },
    {
      status: 401,
    },
  );
}

function notFoundResponse(message = 'Resource not found.') {
  return HttpResponse.json(
    {
      message,
    },
    {
      status: 404,
    },
  );
}

function getLeadRecord(leadId) {
  return state.leads.find((lead) => lead.id === leadId);
}

function getContactRecord(contactId) {
  return state.contacts.find((contact) => contact.id === contactId);
}

function getLeadTimeline(leadId) {
  if (!state.timelineEvents[leadId]) {
    state.timelineEvents[leadId] = [];
  }

  return state.timelineEvents[leadId];
}

function appendTimelineEvent(leadId, event) {
  getLeadTimeline(leadId).push(event);
}

function updateLeadStageTimer(lead, previousStageName, movedAtUtc) {
  const existingTimer = state.stageTimers[lead.id] || {
    currentStageName: previousStageName,
    enteredAtUtc: lead.createdAtUtc,
    daysInCurrentStage: 0,
    previousStages: [],
  };

  const previousStages = [...(existingTimer.previousStages || [])];

  if (
    existingTimer.currentStageName &&
    existingTimer.enteredAtUtc &&
    existingTimer.currentStageName !== lead.stageName
  ) {
    previousStages.push({
      stageName: existingTimer.currentStageName,
      enteredAtUtc: existingTimer.enteredAtUtc,
      exitedAtUtc: movedAtUtc,
      durationDays: Math.max(0, dayjs(movedAtUtc).diff(dayjs(existingTimer.enteredAtUtc), 'day')),
    });
  }

  state.stageTimers[lead.id] = {
    currentStageName: lead.stageName,
    enteredAtUtc: movedAtUtc,
    daysInCurrentStage: 0,
    previousStages,
  };
}

function toLeadDetail(lead) {
  return {
    ...lead,
    contact: getContactRecord(lead.contactId) || null,
  };
}

function buildInquiryTitle(serviceRequested, contactName, fallbackTitle = '') {
  const service = String(serviceRequested || '').trim();
  const contact = String(contactName || '').trim();

  if (service && contact) {
    return `${service} - ${contact}`;
  }

  return String(fallbackTitle || contact || service).trim();
}

function applyLeadFilters(leads, searchParams) {
  const search = searchParams.get('search')?.toLowerCase();
  const source = searchParams.get('source') || searchParams.get('sourceId');
  const stage = searchParams.get('stage') || searchParams.get('stageId');
  const status = searchParams.get('status');
  const owner = searchParams.get('owner');

  return leads.filter((lead) => {
    const matchesSearch =
      !search ||
      [
        lead.title,
        lead.contactName,
        lead.email,
        lead.phone,
        lead.serviceRequested,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));

    return (
      matchesSearch &&
      (!source || lead.source === source) &&
      (!stage || lead.stageId === stage || lead.stageName === stage) &&
      (!status || lead.status === status) &&
      (!owner || lead.ownerUserId === owner)
    );
  });
}

function paginate(items, searchParams) {
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '10');
  const startIndex = (page - 1) * pageSize;
  const pagedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: pagedItems,
    total: items.length,
    page,
    pageSize,
  };
}

function getSearchParams(request) {
  return new URL(request.url).searchParams;
}

function filterTasks(tasks, searchParams) {
  return tasks.filter((task) => {
    const assignedUserId = searchParams.get('assignedUserId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const leadId = searchParams.get('leadId');
    const contactId = searchParams.get('contactId');
    const overdueOnly = searchParams.get('overdueOnly');
    const dueDateFrom = searchParams.get('dueDateFrom');
    const dueDateTo = searchParams.get('dueDateTo');

    return (
      (!assignedUserId || task.assignedUserId === assignedUserId) &&
      (!status || task.status === status) &&
      (!priority || task.priority === priority) &&
      (!leadId || task.leadId === leadId) &&
      (!contactId || task.contactId === contactId) &&
      (!dueDateFrom || dayjs(task.dueDateUtc).isAfter(dayjs(dueDateFrom).subtract(1, 'day'))) &&
      (!dueDateTo || dayjs(task.dueDateUtc).isBefore(dayjs(dueDateTo).add(1, 'day'))) &&
      (overdueOnly !== 'true' || dayjs(task.dueDateUtc).isBefore(dayjs()) && !task.isCompleted)
    );
  });
}

function isWithinDateRange(value, searchParams) {
  if (!value) {
    return true;
  }

  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const currentValue = dayjs(value);

  return (
    (!dateFrom || currentValue.isAfter(dayjs(dateFrom).subtract(1, 'day'))) &&
    (!dateTo || currentValue.isBefore(dayjs(dateTo).add(1, 'day')))
  );
}

function getWonStageIds() {
  return new Set(
    state.pipelineStages
      .filter((stage) => stage.name?.toLowerCase() === 'won')
      .map((stage) => stage.id),
  );
}

function getLeadSources() {
  if (state.leadSources?.length) {
    return state.leadSources;
  }

  return Array.from(
    new Set(state.leads.map((lead) => lead.source).filter(Boolean)),
    (source) => ({
      id: source,
      name: source,
      code: source.toLowerCase().replaceAll(' ', '-'),
      isSystem: true,
      isActive: true,
    }),
  );
}

function isLeadWon(lead) {
  const wonStageIds = getWonStageIds();
  return (
    lead.status?.toLowerCase() === 'won' ||
    wonStageIds.has(lead.stageId) ||
    lead.stageName?.toLowerCase() === 'won'
  );
}

function isLeadLost(lead) {
  return lead.status?.toLowerCase() === 'lost';
}

function filterLeadsForReports(searchParams) {
  const sourceId = searchParams.get('sourceId');
  const ownerUserId = searchParams.get('ownerUserId');

  return state.leads.filter(
    (lead) =>
      (!sourceId || lead.source === sourceId || lead.sourceId === sourceId) &&
      (!ownerUserId || lead.ownerUserId === ownerUserId) &&
      isWithinDateRange(lead.createdAtUtc, searchParams),
  );
}

function getCurrentStageDurationDays(lead) {
  const timer = state.stageTimers[lead.id];
  const enteredAtUtc = timer?.enteredAtUtc || lead.createdAtUtc;
  return Math.max(0, dayjs().diff(dayjs(enteredAtUtc), 'day'));
}

function buildLeadsBySourceReport(searchParams) {
  const grouped = new Map();

  filterLeadsForReports(searchParams).forEach((lead) => {
    const key = lead.source || 'Unattributed';
    const entry = grouped.get(key) || {
      source: key,
      totalLeads: 0,
      openLeads: 0,
      wonLeads: 0,
      lostLeads: 0,
      estimatedValue: 0,
    };

    entry.totalLeads += 1;

    if (isLeadWon(lead)) {
      entry.wonLeads += 1;
    } else if (isLeadLost(lead)) {
      entry.lostLeads += 1;
    } else {
      entry.openLeads += 1;
    }

    entry.estimatedValue += Number(lead.estimatedCost) || 0;
    grouped.set(key, entry);
  });

  return Array.from(grouped.values()).sort((left, right) => right.totalLeads - left.totalLeads);
}

function buildPipelineSummaryReport(searchParams) {
  const filteredLeads = filterLeadsForReports(searchParams);

  return [...state.pipelineStages]
    .sort((left, right) => left.order - right.order)
    .map((stage) => {
      const stageLeads = filteredLeads.filter((lead) => lead.stageId === stage.id);
      const durations = stageLeads.map((lead) => getCurrentStageDurationDays(lead));
      const averageDaysInStage = durations.length
        ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
        : 0;

      return {
        stageName: stage.name,
        leadCount: stageLeads.length,
        totalEstimatedValue: stageLeads.reduce(
          (sum, lead) => sum + (Number(lead.estimatedCost) || 0),
          0,
        ),
        averageDaysInStage,
      };
    });
}

function buildStageAgingReport(searchParams) {
  const filteredLeads = filterLeadsForReports(searchParams);

  return [...state.pipelineStages]
    .sort((left, right) => left.order - right.order)
    .map((stage) => {
      const stageLeads = filteredLeads.filter((lead) => lead.stageId === stage.id);
      const durations = stageLeads.map((lead) => getCurrentStageDurationDays(lead));

      return {
        stageName: stage.name,
        averageDurationDays: durations.length
          ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
          : 0,
        maxDurationDays: durations.length ? Math.max(...durations) : 0,
        currentLeadsInStage: stageLeads.length,
      };
    });
}

function filterTasksForReports(searchParams) {
  const sourceId = searchParams.get('sourceId');
  const ownerUserId = searchParams.get('ownerUserId');

  return state.tasks.filter((task) => {
    const relatedLead = task.leadId ? getLeadRecord(task.leadId) : null;

    return (
      (!ownerUserId || task.assignedUserId === ownerUserId) &&
      (!sourceId || relatedLead?.source === sourceId) &&
      isWithinDateRange(task.dueDateUtc, searchParams)
    );
  });
}

function buildTasksSummaryReport(searchParams) {
  const filteredTasks = filterTasksForReports(searchParams);
  const now = dayjs();
  const tasksByPriority = ['High', 'Medium', 'Low'].map((priority) => ({
    priority,
    count: filteredTasks.filter((task) => task.priority === priority).length,
  }));

  return {
    totalTasks: filteredTasks.length,
    pendingTasks: filteredTasks.filter((task) => !task.isCompleted && task.status !== 'Completed').length,
    completedTasks: filteredTasks.filter((task) => task.isCompleted || task.status === 'Completed').length,
    overdueTasks: filteredTasks.filter(
      (task) => !task.isCompleted && task.dueDateUtc && dayjs(task.dueDateUtc).isBefore(now, 'day'),
    ).length,
    tasksByPriority,
  };
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const handlers = [
  http.get(`${apiBaseUrl}/api/auth/me`, ({ request }) => {
    if (isAuthorized(request)) {
      return HttpResponse.json(state.auth.currentUser);
    }

    return unauthorizedResponse();
  }),
  http.post(`${apiBaseUrl}/api/auth/login`, async ({ request }) => {
    const body = await request.json();

    if (
      body.email !== state.auth.credentials.email ||
      body.password !== state.auth.credentials.password
    ) {
      return HttpResponse.json(
        {
          message: 'Invalid email or password.',
        },
        {
          status: 401,
        },
      );
    }

    state.auth.isAuthenticated = true;

    return HttpResponse.json({
      accessToken: state.auth.accessToken,
      refreshToken: state.auth.refreshToken,
      user: state.auth.currentUser,
    });
  }),
  http.post(`${apiBaseUrl}/api/auth/refresh`, ({ request }) => {
    if (isAuthorized(request)) {
      return HttpResponse.json({
        accessToken: state.auth.accessToken,
        refreshToken: state.auth.refreshToken,
      });
    }

    return unauthorizedResponse();
  }),
  http.post(`${apiBaseUrl}/api/auth/logout`, () => {
    state.auth.isAuthenticated = false;

    return HttpResponse.json({
      success: true,
    });
  }),
  http.get(`${apiBaseUrl}/api/leads`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const searchParams = getSearchParams(request);
    const filteredLeads = applyLeadFilters(state.leads, searchParams);
    return HttpResponse.json(paginate(filteredLeads, searchParams));
  }),
  http.post(`${apiBaseUrl}/api/leads`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const stageId = body.stageId || body.currentPipelineStageId;
    const sourceId = body.source || body.sourceId || body.leadSourceId;
    let contact = getContactRecord(body.contactId);

    if (!contact && body.contactName) {
      contact = {
        id: createId('contact'),
        salutation: body.contactSalutation || '',
        fullName: body.contactName,
        email: body.contactEmail || '',
        phone: body.contactPhone || '',
        companyName: '',
        createdAtUtc: dayjs().toISOString(),
        updatedAtUtc: dayjs().toISOString(),
      };
      state.contacts.unshift(contact);
    }

    const stage = state.pipelineStages.find((item) => item.id === stageId);
    const owner = state.users.find((item) => item.id === body.ownerUserId);
    const createdLead = {
      id: createId('lead'),
      ...body,
      title: buildInquiryTitle(body.serviceRequested, contact?.fullName, body.title),
      contactId: contact?.id || body.contactId || '',
      contactSalutation: contact?.salutation || '',
      contactName: contact?.fullName || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      source: getLeadSources().find((item) => item.id === sourceId)?.name || sourceId || '',
      sourceId,
      stageId,
      stageName: stage?.name || '',
      ownerName: owner?.fullName || '',
      daysInCurrentStage: 0,
      currentStageEnteredAtUtc: dayjs().toISOString(),
      createdAtUtc: dayjs().toISOString(),
      updatedAtUtc: dayjs().toISOString(),
      isDuplicateWarning: false,
    };

    state.leads.unshift(createdLead);
    persistState();

    return HttpResponse.json(createdLead, { status: 201 });
  }),
  http.get(`${apiBaseUrl}/api/leads/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const lead = getLeadRecord(params.id);

    if (!lead) {
      return notFoundResponse('Lead not found.');
    }

    return HttpResponse.json(toLeadDetail(lead));
  }),
  http.put(`${apiBaseUrl}/api/leads/:id`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const leadIndex = state.leads.findIndex((lead) => lead.id === params.id);

    if (leadIndex === -1) {
      return notFoundResponse('Lead not found.');
    }

    const body = await request.json();
    const existingLead = state.leads[leadIndex];
    const contact = getContactRecord(body.contactId || existingLead.contactId);
    const stageId = body.stageId || body.currentPipelineStageId || existingLead.stageId;
    const sourceId = body.source || body.sourceId || body.leadSourceId || existingLead.sourceId || existingLead.source;
    const stage = state.pipelineStages.find((item) => item.id === stageId);
    const owner = state.users.find(
      (item) => item.id === (body.ownerUserId || existingLead.ownerUserId),
    );

    if (contact) {
      contact.salutation = body.contactSalutation ?? contact.salutation;
      contact.fullName = body.contactName || contact.fullName;
      contact.email = body.contactEmail ?? contact.email;
      contact.phone = body.contactPhone ?? contact.phone;
      contact.updatedAtUtc = dayjs().toISOString();
    }

    state.leads[leadIndex] = {
      ...existingLead,
      ...body,
      source: getLeadSources().find((item) => item.id === sourceId)?.name || sourceId || existingLead.source,
      sourceId,
      stageId,
      title: buildInquiryTitle(
        body.serviceRequested ?? existingLead.serviceRequested,
        contact?.fullName || existingLead.contactName,
        body.title ?? existingLead.title,
      ),
      contactSalutation: contact?.salutation || existingLead.contactSalutation || '',
      contactName: contact?.fullName || existingLead.contactName,
      email: contact?.email || existingLead.email,
      phone: contact?.phone || existingLead.phone,
      stageName: stage?.name || existingLead.stageName,
      ownerName: owner?.fullName || existingLead.ownerName,
      updatedAtUtc: dayjs().toISOString(),
    };
    persistState();

    return HttpResponse.json(state.leads[leadIndex]);
  }),
  http.delete(`${apiBaseUrl}/api/leads/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    state.leads = state.leads.filter((lead) => lead.id !== params.id);
    persistState();
    return HttpResponse.json({ success: true });
  }),
  http.patch(`${apiBaseUrl}/api/leads/:id/stage`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const lead = getLeadRecord(params.id);

    if (!lead) {
      return notFoundResponse('Lead not found.');
    }

    const body = await request.json();
    const stageId = body.stageId || body.pipelineStageId;
    const stage = state.pipelineStages.find((item) => item.id === stageId);
    const previousStageId = lead.stageId;
    const previousStageName = lead.stageName;
    const movedAtUtc = dayjs().toISOString();

    lead.stageId = stageId;
    lead.stageName = stage?.name || lead.stageName;
    lead.daysInCurrentStage = 0;
    lead.currentStageEnteredAtUtc = movedAtUtc;
    lead.updatedAtUtc = movedAtUtc;

    if (previousStageId !== stageId) {
      updateLeadStageTimer(lead, previousStageName, movedAtUtc);
      appendTimelineEvent(lead.id, {
        id: createId('timeline'),
        activityType: 'StageChanged',
        title: `Moved to ${lead.stageName}`,
        description: `Lead moved from ${previousStageName} to ${lead.stageName}.`,
        user: state.auth.currentUser,
        createdAtUtc: movedAtUtc,
        metadata: {
          fromStage: previousStageName,
          toStage: lead.stageName,
        },
      });
    }

    persistState();

    return HttpResponse.json(lead);
  }),
  http.get(`${apiBaseUrl}/api/leads/:id/timeline`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(state.timelineEvents[params.id] || []);
  }),
  http.get(`${apiBaseUrl}/api/leads/:id/duplicates`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(
      state.duplicateMatches[params.id] || {
        matchedContacts: [],
        matchedLeads: [],
        matchFields: [],
      },
    );
  }),
  http.get(`${apiBaseUrl}/api/leads/:id/stage-timer`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(state.stageTimers[params.id] || null);
  }),
  http.get(`${apiBaseUrl}/api/contacts`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(paginate(state.contacts, getSearchParams(request)));
  }),
  http.post(`${apiBaseUrl}/api/contacts`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const contact = {
      id: createId('contact'),
      ...body,
      createdAtUtc: dayjs().toISOString(),
      updatedAtUtc: dayjs().toISOString(),
    };

    state.contacts.unshift(contact);
    persistState();
    return HttpResponse.json(contact, { status: 201 });
  }),
  http.get(`${apiBaseUrl}/api/contacts/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const contact = getContactRecord(params.id);

    if (!contact) {
      return notFoundResponse('Contact not found.');
    }

    return HttpResponse.json(contact);
  }),
  http.put(`${apiBaseUrl}/api/contacts/:id`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const contactIndex = state.contacts.findIndex((contact) => contact.id === params.id);

    if (contactIndex === -1) {
      return notFoundResponse('Contact not found.');
    }

    const body = await request.json();

    state.contacts[contactIndex] = {
      ...state.contacts[contactIndex],
      ...body,
      updatedAtUtc: dayjs().toISOString(),
    };
    persistState();

    return HttpResponse.json(state.contacts[contactIndex]);
  }),
  http.delete(`${apiBaseUrl}/api/contacts/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    state.contacts = state.contacts.filter((contact) => contact.id !== params.id);
    persistState();
    return HttpResponse.json({ success: true });
  }),
  http.get(`${apiBaseUrl}/api/leads/:leadId/notes`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(
      state.notes.filter((note) => note.leadId === params.leadId),
    );
  }),
  http.post(`${apiBaseUrl}/api/leads/:leadId/notes`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const content = body.content ?? body.body ?? '';
    const note = {
      id: createId('note'),
      leadId: params.leadId,
      content,
      createdByUserId: state.auth.currentUser.id,
      createdByName: state.auth.currentUser.fullName,
      createdAtUtc: dayjs().toISOString(),
      updatedAtUtc: dayjs().toISOString(),
    };

    state.notes.unshift(note);
    persistState();
    return HttpResponse.json(note, { status: 201 });
  }),
  http.put(`${apiBaseUrl}/api/notes/:id`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const noteIndex = state.notes.findIndex((note) => note.id === params.id);

    if (noteIndex === -1) {
      return notFoundResponse('Note not found.');
    }

    const body = await request.json();
    const content = body.content ?? body.body ?? state.notes[noteIndex].content;
    state.notes[noteIndex] = {
      ...state.notes[noteIndex],
      ...body,
      content,
      updatedAtUtc: dayjs().toISOString(),
    };
    persistState();

    return HttpResponse.json(state.notes[noteIndex]);
  }),
  http.delete(`${apiBaseUrl}/api/notes/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    state.notes = state.notes.filter((note) => note.id !== params.id);
    persistState();
    return HttpResponse.json({ success: true });
  }),
  http.get(`${apiBaseUrl}/api/pipeline/stages`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json([...state.pipelineStages].sort((a, b) => a.order - b.order));
  }),
  http.get(`${apiBaseUrl}/api/lead-sources`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(getLeadSources());
  }),
  http.get(`${apiBaseUrl}/api/services`, () => {
    return HttpResponse.json(state.services || []);
  }),
  http.get(`${apiBaseUrl}/api/services/all`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(state.services || []);
  }),
  http.post(`${apiBaseUrl}/api/services`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const service = {
      id: createId('service'),
      code: body.name.toLowerCase().replaceAll(' ', '_'),
      estimatedCost: null,
      isActive: true,
      ...body,
    };

    state.services.push(service);
    persistState();
    return HttpResponse.json(service, { status: 201 });
  }),
  http.put(`${apiBaseUrl}/api/services/:id`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const index = state.services.findIndex((service) => service.id === params.id);

    if (index === -1) {
      return notFoundResponse('Service not found.');
    }

    const body = await request.json();
    state.services[index] = {
      ...state.services[index],
      ...body,
      code: body.name?.toLowerCase().replaceAll(' ', '_') || state.services[index].code,
    };
    persistState();
    return HttpResponse.json(state.services[index]);
  }),
  http.delete(`${apiBaseUrl}/api/services/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    state.services = state.services.filter((service) => service.id !== params.id);
    persistState();
    return HttpResponse.json({ success: true });
  }),
  http.post(`${apiBaseUrl}/api/pipeline/stages`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const stage = {
      id: createId('stage'),
      order: state.pipelineStages.length + 1,
      isActive: true,
      ...body,
    };

    state.pipelineStages.push(stage);
    persistState();
    return HttpResponse.json(stage, { status: 201 });
  }),
  http.put(`${apiBaseUrl}/api/pipeline/stages/reorder`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const stageIds = body.stageIds || body.stages?.map((stage) => stage.id) || [];

    state.pipelineStages = stageIds.map((stageId, index) => {
      const stage = state.pipelineStages.find((item) => item.id === stageId);
      return {
        ...stage,
        order: index + 1,
      };
    });
    persistState();

    return HttpResponse.json(state.pipelineStages);
  }),
  http.put(`${apiBaseUrl}/api/pipeline/stages/:id`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const index = state.pipelineStages.findIndex((item) => item.id === params.id);

    if (index === -1) {
      return notFoundResponse('Stage not found.');
    }

    const body = await request.json();
    state.pipelineStages[index] = {
      ...state.pipelineStages[index],
      ...body,
    };
    persistState();

    return HttpResponse.json(state.pipelineStages[index]);
  }),
  http.delete(`${apiBaseUrl}/api/pipeline/stages/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    state.pipelineStages = state.pipelineStages.filter((item) => item.id !== params.id);
    persistState();
    return HttpResponse.json({ success: true });
  }),
  http.get(`${apiBaseUrl}/api/tasks`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const searchParams = getSearchParams(request);
    const filteredTasks = filterTasks(state.tasks, searchParams);
    return HttpResponse.json(paginate(filteredTasks, searchParams));
  }),
  http.post(`${apiBaseUrl}/api/tasks`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const assignedUser = state.users.find((item) => item.id === body.assignedUserId);
    const relatedLead = body.leadId ? getLeadRecord(body.leadId) : null;
    const task = {
      id: createId('task'),
      isCompleted: body.status === 'Completed',
      status: body.status || 'Pending',
      assignedUserName: assignedUser?.fullName || '',
      ...body,
    };

    state.tasks.unshift(task);
    if (relatedLead) {
      appendTimelineEvent(relatedLead.id, {
        id: createId('timeline'),
        activityType: 'TaskCreated',
        title: `Task created: ${task.title}`,
        description: 'A follow-up task was added for this lead.',
        user: state.auth.currentUser,
        createdAtUtc: dayjs().toISOString(),
        metadata: {
          assignedTo: task.assignedUserName || 'Unassigned',
          priority: task.priority,
          dueDate: task.dueDateUtc,
        },
      });
    }
    persistState();
    return HttpResponse.json(task, { status: 201 });
  }),
  http.get(`${apiBaseUrl}/api/tasks/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const task = state.tasks.find((item) => item.id === params.id);

    if (!task) {
      return notFoundResponse('Task not found.');
    }

    return HttpResponse.json(task);
  }),
  http.put(`${apiBaseUrl}/api/tasks/:id`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const index = state.tasks.findIndex((item) => item.id === params.id);

    if (index === -1) {
      return notFoundResponse('Task not found.');
    }

    const body = await request.json();
    const assignedUser = state.users.find(
      (item) => item.id === (body.assignedUserId || state.tasks[index].assignedUserId),
    );
    state.tasks[index] = {
      ...state.tasks[index],
      ...body,
      assignedUserName: assignedUser?.fullName || state.tasks[index].assignedUserName,
      isCompleted:
        body.status === 'Completed' ? true : body.status ? false : state.tasks[index].isCompleted,
    };
    persistState();

    return HttpResponse.json(state.tasks[index]);
  }),
  http.patch(`${apiBaseUrl}/api/tasks/:id/complete`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const task = state.tasks.find((item) => item.id === params.id);

    if (!task) {
      return notFoundResponse('Task not found.');
    }

    task.isCompleted = true;
    task.status = 'Completed';
    if (task.leadId) {
      appendTimelineEvent(task.leadId, {
        id: createId('timeline'),
        activityType: 'TaskCompleted',
        title: `Task completed: ${task.title}`,
        description: 'A task tied to this lead was marked as complete.',
        user: state.auth.currentUser,
        createdAtUtc: dayjs().toISOString(),
        metadata: {
          priority: task.priority,
          assignedTo: task.assignedUserName || 'Unassigned',
        },
      });
    }
    persistState();

    return HttpResponse.json(task);
  }),
  http.delete(`${apiBaseUrl}/api/tasks/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    state.tasks = state.tasks.filter((item) => item.id !== params.id);
    persistState();
    return HttpResponse.json({ success: true });
  }),
  http.get(`${apiBaseUrl}/api/automation/rules`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(state.automationRules);
  }),
  http.post(`${apiBaseUrl}/api/automation/rules`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const rule = {
      id: createId('automation'),
      ...body,
    };

    state.automationRules.unshift(rule);
    persistState();
    return HttpResponse.json(rule, { status: 201 });
  }),
  http.get(`${apiBaseUrl}/api/automation/rules/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const rule = state.automationRules.find((item) => item.id === params.id);

    if (!rule) {
      return notFoundResponse('Automation rule not found.');
    }

    return HttpResponse.json(rule);
  }),
  http.put(`${apiBaseUrl}/api/automation/rules/:id`, async ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const index = state.automationRules.findIndex((item) => item.id === params.id);

    if (index === -1) {
      return notFoundResponse('Automation rule not found.');
    }

    const body = await request.json();
    state.automationRules[index] = {
      ...state.automationRules[index],
      ...body,
    };
    persistState();

    return HttpResponse.json(state.automationRules[index]);
  }),
  http.delete(`${apiBaseUrl}/api/automation/rules/:id`, ({ params, request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    state.automationRules = state.automationRules.filter((item) => item.id !== params.id);
    persistState();
    return HttpResponse.json({ success: true });
  }),
  http.get(`${apiBaseUrl}/api/reports/leads-by-source`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(buildLeadsBySourceReport(getSearchParams(request)));
  }),
  http.get(`${apiBaseUrl}/api/reports/pipeline-summary`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(buildPipelineSummaryReport(getSearchParams(request)));
  }),
  http.get(`${apiBaseUrl}/api/reports/stage-aging`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(buildStageAgingReport(getSearchParams(request)));
  }),
  http.get(`${apiBaseUrl}/api/reports/tasks-summary`, ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return HttpResponse.json(buildTasksSummaryReport(getSearchParams(request)));
  }),
  http.post(`${apiBaseUrl}/api/public/lead-capture`, async ({ request }) => {
    const body = await request.json();

    if (body.honeypot) {
      return HttpResponse.json(
        {
          message: 'Submission rejected.',
        },
        {
          status: 400,
        },
      );
    }

    return HttpResponse.json(state.publicLeadCaptureResponse, { status: 201 });
  }),
];
