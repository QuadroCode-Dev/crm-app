import dayjs from 'dayjs';
import {
  mockAccessToken,
  mockAuthCredentials,
  mockRefreshToken,
  mockAuthUser,
} from './authMockData.js';

const now = dayjs('2026-05-17T09:30:00Z');

export const mockUsers = [
  mockAuthUser,
  {
    id: 'user-2',
    fullName: 'Mert Kaya',
    email: 'mert@example.com',
  },
  {
    id: 'user-3',
    fullName: 'Selin Aras',
    email: 'selin@example.com',
  },
];

export const mockContacts = [
  {
    id: 'contact-1',
    fullName: 'Elif Yilmaz',
    email: 'elif@example.com',
    phone: '+90 555 100 1001',
    companyName: 'Northwind Solar',
    createdAtUtc: now.subtract(18, 'day').toISOString(),
    updatedAtUtc: now.subtract(2, 'day').toISOString(),
  },
  {
    id: 'contact-2',
    fullName: 'Can Demir',
    email: 'can@example.com',
    phone: '+90 555 100 1002',
    companyName: 'Apex Kitchens',
    createdAtUtc: now.subtract(14, 'day').toISOString(),
    updatedAtUtc: now.subtract(1, 'day').toISOString(),
  },
  {
    id: 'contact-3',
    fullName: 'Derya Akin',
    email: 'derya@example.com',
    phone: '+90 555 100 1003',
    companyName: 'Bluewave Studio',
    createdAtUtc: now.subtract(11, 'day').toISOString(),
    updatedAtUtc: now.subtract(1, 'hour').toISOString(),
  },
];

export const mockPipelineStages = [
  { id: 'stage-1', name: 'Incoming', order: 1, isActive: true },
  { id: 'stage-2', name: 'Qualified', order: 2, isActive: true },
  { id: 'stage-3', name: 'Proposal', order: 3, isActive: true },
  { id: 'stage-4', name: 'Negotiation', order: 4, isActive: true },
  { id: 'stage-5', name: 'Won', order: 5, isActive: true },
];

export const mockServices = [
  {
    id: 'service-1',
    name: 'Hair Transplant',
    code: 'hair_transplant',
    estimatedCost: 1500,
    isActive: true,
  },
  {
    id: 'service-2',
    name: 'Plastic Surgery',
    code: 'plastic_surgery',
    estimatedCost: 2500,
    isActive: true,
  },
  {
    id: 'service-3',
    name: 'Rhinoplasty',
    code: 'rhinoplasty',
    estimatedCost: null,
    isActive: true,
  },
];

export const mockLeads = [
  {
    id: 'lead-1',
    title: 'Solar rooftop installation',
    contactId: 'contact-1',
    contactName: 'Elif Yilmaz',
    email: 'elif@example.com',
    phone: '+90 555 100 1001',
    source: 'Landing Page',
    stageId: 'stage-2',
    stageName: 'Qualified',
    status: 'Open',
    estimatedCost: 18500,
    serviceRequested: 'Residential solar installation',
    ownerUserId: 'user-1',
    ownerName: 'Ayla Demir',
    message: 'Interested in a rooftop setup before summer.',
    createdAtUtc: now.subtract(9, 'day').toISOString(),
    updatedAtUtc: now.subtract(4, 'hour').toISOString(),
    isDuplicateWarning: true,
  },
  {
    id: 'lead-2',
    title: 'Kitchen remodel consultation',
    contactId: 'contact-2',
    contactName: 'Can Demir',
    email: 'can@example.com',
    phone: '+90 555 100 1002',
    source: 'Referral',
    stageId: 'stage-3',
    stageName: 'Proposal',
    status: 'Open',
    estimatedCost: 9200,
    serviceRequested: 'Kitchen remodel',
    ownerUserId: 'user-2',
    ownerName: 'Mert Kaya',
    message: 'Needs proposal for a premium upgrade package.',
    createdAtUtc: now.subtract(7, 'day').toISOString(),
    updatedAtUtc: now.subtract(1, 'day').toISOString(),
    isDuplicateWarning: false,
  },
  {
    id: 'lead-3',
    title: 'Brand website redesign',
    contactId: 'contact-3',
    contactName: 'Derya Akin',
    email: 'derya@example.com',
    phone: '+90 555 100 1003',
    source: 'Organic Search',
    stageId: 'stage-1',
    stageName: 'Incoming',
    status: 'New',
    estimatedCost: 6400,
    serviceRequested: 'Website redesign',
    ownerUserId: 'user-3',
    ownerName: 'Selin Aras',
    message: 'Looking for a modern responsive relaunch.',
    createdAtUtc: now.subtract(3, 'day').toISOString(),
    updatedAtUtc: now.subtract(12, 'hour').toISOString(),
    isDuplicateWarning: false,
  },
];

export const mockNotes = [
  {
    id: 'note-1',
    leadId: 'lead-1',
    content: 'Confirmed budget range and timeline for June.',
    createdByUserId: 'user-1',
    createdByName: 'Ayla Demir',
    createdAtUtc: now.subtract(5, 'day').toISOString(),
    updatedAtUtc: now.subtract(3, 'day').toISOString(),
  },
  {
    id: 'note-2',
    leadId: 'lead-2',
    content: 'Requested updated floor plan before final quote.',
    createdByUserId: 'user-2',
    createdByName: 'Mert Kaya',
    createdAtUtc: now.subtract(2, 'day').toISOString(),
    updatedAtUtc: now.subtract(2, 'day').toISOString(),
  },
];

export const mockTasks = [
  {
    id: 'task-1',
    title: 'Call customer about site inspection',
    leadId: 'lead-1',
    contactId: 'contact-1',
    assignedUserId: 'user-1',
    assignedUserName: 'Ayla Demir',
    priority: 'High',
    status: 'Pending',
    dueDateUtc: now.add(1, 'day').toISOString(),
    isCompleted: false,
  },
  {
    id: 'task-2',
    title: 'Prepare proposal deck',
    leadId: 'lead-2',
    contactId: 'contact-2',
    assignedUserId: 'user-2',
    assignedUserName: 'Mert Kaya',
    priority: 'Medium',
    status: 'Pending',
    dueDateUtc: now.add(2, 'day').toISOString(),
    isCompleted: false,
  },
  {
    id: 'task-3',
    title: 'Review brand references',
    leadId: 'lead-3',
    contactId: 'contact-3',
    assignedUserId: 'user-3',
    assignedUserName: 'Selin Aras',
    priority: 'Low',
    status: 'Completed',
    dueDateUtc: now.subtract(1, 'day').toISOString(),
    isCompleted: true,
  },
];

export const mockAutomationRules = [
  {
    id: 'automation-1',
    name: 'Create follow-up task on qualification',
    triggerType: 'StageChanged',
    actionType: 'CreateTask',
    targetStageId: 'stage-2',
    isActive: true,
    taskTitleTemplate: 'Follow up with {contactName}',
    taskDescriptionTemplate: 'Discuss next steps for {leadTitle}',
    taskDueOffsetDays: 2,
    assignToOwner: true,
  },
];

export const mockTimelineEvents = {
  'lead-1': [
    {
      id: 'timeline-1',
      activityType: 'LeadCreated',
      title: 'Lead created',
      description: 'Lead entered the CRM from the public landing page.',
      user: mockAuthUser,
      createdAtUtc: now.subtract(9, 'day').toISOString(),
      metadata: {
        source: 'Landing Page',
      },
    },
    {
      id: 'timeline-2',
      activityType: 'DuplicateWarningCreated',
      title: 'Potential duplicate found',
      description: 'System matched this lead with an existing contact record.',
      user: null,
      createdAtUtc: now.subtract(8, 'day').toISOString(),
      metadata: {
        matchFields: ['email', 'phone'],
      },
    },
    {
      id: 'timeline-3',
      activityType: 'StageChanged',
      title: 'Moved to Qualified',
      description: 'Lead was advanced after the discovery call.',
      user: mockAuthUser,
      createdAtUtc: now.subtract(4, 'day').toISOString(),
      metadata: {
        fromStage: 'Incoming',
        toStage: 'Qualified',
      },
    },
  ],
  'lead-2': [
    {
      id: 'timeline-4',
      activityType: 'LeadCreated',
      title: 'Lead created',
      description: 'Lead imported from a referral source.',
      user: mockUsers[1],
      createdAtUtc: now.subtract(7, 'day').toISOString(),
      metadata: {
        source: 'Referral',
      },
    },
  ],
  'lead-3': [
    {
      id: 'timeline-5',
      activityType: 'LandingPageLeadReceived',
      title: 'Landing page lead received',
      description: 'Lead capture request reached the CRM.',
      user: null,
      createdAtUtc: now.subtract(3, 'day').toISOString(),
      metadata: {
        source: 'Organic Search',
      },
    },
  ],
};

export const mockDuplicateMatches = {
  'lead-1': {
    matchedContacts: [
      {
        id: 'contact-1',
        fullName: 'Elif Yilmaz',
        email: 'elif@example.com',
        phone: '+90 555 100 1001',
      },
    ],
    matchedLeads: [
      {
        id: 'lead-legacy-1',
        title: 'Existing solar estimate',
        email: 'elif@example.com',
        phone: '+90 555 100 1001',
      },
    ],
    matchFields: ['email', 'phone'],
  },
  'lead-2': {
    matchedContacts: [],
    matchedLeads: [],
    matchFields: [],
  },
  'lead-3': {
    matchedContacts: [],
    matchedLeads: [],
    matchFields: [],
  },
};

export const mockStageTimers = {
  'lead-1': {
    currentStageName: 'Qualified',
    enteredAtUtc: now.subtract(4, 'day').toISOString(),
    daysInCurrentStage: 4,
    previousStages: [
      {
        stageName: 'Incoming',
        enteredAtUtc: now.subtract(9, 'day').toISOString(),
        exitedAtUtc: now.subtract(4, 'day').toISOString(),
        durationDays: 5,
      },
    ],
  },
  'lead-2': {
    currentStageName: 'Proposal',
    enteredAtUtc: now.subtract(2, 'day').toISOString(),
    daysInCurrentStage: 2,
    previousStages: [
      {
        stageName: 'Qualified',
        enteredAtUtc: now.subtract(6, 'day').toISOString(),
        exitedAtUtc: now.subtract(2, 'day').toISOString(),
        durationDays: 4,
      },
    ],
  },
  'lead-3': {
    currentStageName: 'Incoming',
    enteredAtUtc: now.subtract(3, 'day').toISOString(),
    daysInCurrentStage: 3,
    previousStages: [],
  },
};

export const mockReports = {
  leadsBySource: [
    {
      source: 'Landing Page',
      totalLeads: 12,
      openLeads: 5,
      wonLeads: 4,
      lostLeads: 3,
      estimatedValue: 48200,
    },
    {
      source: 'Referral',
      totalLeads: 8,
      openLeads: 4,
      wonLeads: 3,
      lostLeads: 1,
      estimatedValue: 26700,
    },
  ],
  pipelineSummary: [
    {
      stageName: 'Incoming',
      leadCount: 7,
      totalEstimatedValue: 32000,
      averageDaysInStage: 3,
    },
    {
      stageName: 'Qualified',
      leadCount: 5,
      totalEstimatedValue: 41000,
      averageDaysInStage: 4,
    },
  ],
  stageAging: [
    {
      stageName: 'Incoming',
      averageDurationDays: 3,
      maxDurationDays: 8,
      currentLeadsInStage: 7,
    },
    {
      stageName: 'Proposal',
      averageDurationDays: 6,
      maxDurationDays: 13,
      currentLeadsInStage: 4,
    },
  ],
  tasksSummary: {
    totalTasks: 21,
    pendingTasks: 11,
    completedTasks: 8,
    overdueTasks: 2,
    tasksByPriority: [
      { priority: 'High', count: 6 },
      { priority: 'Medium', count: 10 },
      { priority: 'Low', count: 5 },
    ],
  },
};

export const mockLandingLeadCaptureResponse = {
  success: true,
  trackingId: '9d1f4bc9-33c6-48eb-9d4e-a16c4a53e4bb',
  message: 'Lead received successfully',
};

export const baseMockState = {
  auth: {
    credentials: mockAuthCredentials,
    accessToken: mockAccessToken,
    refreshToken: mockRefreshToken,
    currentUser: mockAuthUser,
    isAuthenticated: false,
  },
  users: mockUsers,
  contacts: mockContacts,
  pipelineStages: mockPipelineStages,
  services: mockServices,
  leads: mockLeads,
  notes: mockNotes,
  tasks: mockTasks,
  automationRules: mockAutomationRules,
  timelineEvents: mockTimelineEvents,
  duplicateMatches: mockDuplicateMatches,
  stageTimers: mockStageTimers,
  reports: mockReports,
  publicLeadCaptureResponse: mockLandingLeadCaptureResponse,
};
