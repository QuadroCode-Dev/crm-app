import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import AppProviders from '../../app/providers/AppProviders.jsx';
import { createTestRouter } from '../../app/router.jsx';
import { clearAuthSession, setAuthSession } from '../auth/authSession.js';
import { mockAccessToken, mockAuthUser } from '../../shared/mocks/authMockData.js';
import { handlers, resetMockState } from '../../shared/mocks/handlers.js';

const apiBaseUrl = 'http://localhost:5000';
const server = setupServer(...handlers);

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
  window.sessionStorage.clear();
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('Dashboard feature', () => {
  it('renders the dashboard summary cards', async () => {
    authenticate();

    renderRoute(['/dashboard']);

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('New leads')).toBeInTheDocument();
    expect(screen.getByText('Open leads')).toBeInTheDocument();
    expect(screen.getByText('Open Pipeline Value')).toBeInTheDocument();
    expect(screen.getByText('Won Revenue')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('Overdue Follow-ups')).toBeInTheDocument();
  });

  it('renders quick actions with the expected destinations', async () => {
    authenticate();

    renderRoute(['/dashboard']);

    expect(await screen.findByRole('link', { name: 'Create lead' })).toHaveAttribute('href', '/leads');
    expect(screen.getByRole('link', { name: 'Create task' })).toHaveAttribute('href', '/tasks');
    expect(screen.getByRole('link', { name: 'Go to pipeline' })).toHaveAttribute('href', '/pipeline');
    expect(screen.getByRole('link', { name: 'Open reports' })).toHaveAttribute('href', '/reports');
  });

  it('shows a loading state while dashboard queries are in flight', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/tasks-summary`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json({
          totalTasks: 0,
          pendingTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          tasksByPriority: [],
        });
      }),
    );

    renderRoute(['/dashboard']);

    expect(document.querySelector('.crm-loading-state')).not.toBeNull();
    await screen.findByRole('heading', { name: 'Dashboard' });
  });

  it('shows an error state when a dashboard request fails', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/leads-by-source`, () =>
        HttpResponse.json(
          { message: 'Dashboard summary unavailable.' },
          { status: 500 },
        ),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByText(/Unable to load dashboard\./)).toBeInTheDocument();
    expect(screen.getByText(/Dashboard summary unavailable\./)).toBeInTheDocument();
  });
});
