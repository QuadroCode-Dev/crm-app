import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import AppProviders from '../../app/providers/AppProviders.jsx';
import { createTestRouter } from '../../app/router.jsx';
import { clearAuthSession, setAuthSession } from '../auth/authSession.js';
import { mockAccessToken, mockAuthUser } from '../../shared/mocks/authMockData.js';
import { handlers, resetMockState } from '../../shared/mocks/handlers.js';

const server = setupServer(...handlers);
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function renderRoute(initialEntries) {
  const router = createTestRouter(initialEntries);

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { router };
}

function authenticate() {
  setAuthSession({
    accessToken: mockAccessToken,
    user: mockAuthUser,
  });
}

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  resetMockState();
  clearAuthSession();
  window.localStorage.clear();
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('Users Management feature', () => {
  it('redirects sales managers away from users management', async () => {
    const salesManagerUser = {
      ...mockAuthUser,
      role: 'SalesManager',
      permissions: ['leads.assign', 'tasks.assign'],
    };

    server.use(
      http.get(`${apiBaseUrl}/api/auth/me`, () => HttpResponse.json(salesManagerUser)),
    );

    authenticate();
    setAuthSession({
      user: salesManagerUser,
    });

    const { router } = renderRoute(['/users-management']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard');
    });
    expect(screen.queryByRole('heading', { name: 'Users Management' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users Management' })).not.toBeInTheDocument();
  });

  it('renders users and roles permissions', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/users-management']);

    expect(await screen.findByRole('heading', { name: 'Users Management' })).toBeInTheDocument();
    expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0);
    expect(screen.getByText('Sales Manager')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Roles & Permissions' }));

    expect(await screen.findByRole('heading', { name: 'Roles & Permissions' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Leads' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Change stage')).toBeInTheDocument();
    const permissionsTable = screen.getByRole('table');
    expect(within(permissionsTable).getByText('Data importer')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Admin - Manage data imports' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Sales Manager - Delete leads' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Super Admin/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Agent/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Save' })[0]).toBeDisabled();
  });

  it('creates a user with a fixed role', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/users-management']);

    await screen.findByRole('heading', { name: 'Users Management' });
    await user.click(screen.getByRole('button', { name: 'Add user' }));

    const dialog = await screen.findByRole('dialog', { name: 'Create user' });
    await user.type(within(dialog).getByLabelText('Full name'), 'Nora Haddad');
    await user.type(within(dialog).getByLabelText('Email'), 'nora@example.com');
    await user.type(within(dialog).getByLabelText('Password'), 'secret123');
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('User created successfully.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Nora Haddad')).toBeInTheDocument();
    });
  });
});
