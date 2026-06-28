export const mockAuthCredentials = {
  email: 'Admin@crm.com',
  password: 'secret123',
};

export const mockAuthUser = {
  id: 'user-1',
  fullName: 'Admin User',
  email: mockAuthCredentials.email,
  role: 'SuperAdmin',
  permissions: [
    'users.manage',
    'roles.manage',
    'contacts.create',
    'contacts.edit',
    'contacts.delete',
    'pipeline.view',
    'leads.create',
    'leads.edit',
    'leads.delete',
    'leads.assign',
    'leads.change_stage',
    'tasks.create',
    'tasks.edit',
    'tasks.delete',
    'tasks.assign',
    'tasks.complete',
    'reports.view',
    'settings.manage',
    'settings.pipeline.manage',
    'settings.services.manage',
    'settings.automation.manage',
    'settings.integrations.manage',
  ],
};

export const mockAccessToken = 'valid-token';
export const mockRefreshToken = 'valid-refresh-token';
