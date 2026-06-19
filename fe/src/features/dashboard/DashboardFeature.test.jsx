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

  it('renders sales funnel stage counts and conversions', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/pipeline-summary`, () =>
        HttpResponse.json([
          {
            stage: 'New Lead',
            count: 120,
            totalEstimatedValue: 120000,
            averageDaysInStage: 2,
          },
          {
            stage: 'Contacted',
            count: 85,
            totalEstimatedValue: 85000,
            averageDaysInStage: 3,
          },
          {
            stage: 'Qualified',
            count: 42,
            totalEstimatedValue: 42000,
            averageDaysInStage: 4,
          },
          {
            stage: 'Proposal Sent',
            count: 18,
            totalEstimatedValue: 18000,
            averageDaysInStage: 5,
          },
          {
            stage: 'Won',
            count: 9,
            totalEstimatedValue: 9000,
            averageDaysInStage: 6,
          },
        ]),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Sales Funnel')).toBeInTheDocument();
    expect(await screen.findByText('New Lead -> Contacted')).toBeInTheDocument();
    expect(await screen.findByText('70.8%')).toBeInTheDocument();
    expect(await screen.findByText('Contacted -> Qualified')).toBeInTheDocument();
    expect(await screen.findByText('49.4%')).toBeInTheDocument();
    expect(await screen.findByText('Qualified -> Proposal Sent')).toBeInTheDocument();
    expect(await screen.findByText('42.9%')).toBeInTheDocument();
    expect(await screen.findByText('Proposal Sent -> Won')).toBeInTheDocument();
    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('shows an empty state when sales funnel data is unavailable', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/pipeline-summary`, () => HttpResponse.json([])),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('No funnel data yet')).toBeInTheDocument();
    expect(
      screen.getByText('Pipeline stages will appear here once leads are assigned to stages.'),
    ).toBeInTheDocument();
  });

  it('renders pipeline value by stage with mock values', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/pipeline-summary`, () =>
        HttpResponse.json([
          { stage: 'New Lead', count: 12, value: 12000 },
          { stage: 'Contacted', count: 8, value: 8500 },
          { stage: 'Qualified', count: 6, value: 21000 },
          { stage: 'Proposal Sent', count: 3, value: 15000 },
          { stage: 'Won', count: 2, value: 9000 },
          { stage: 'Lost', count: 1, value: 6000 },
        ]),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Pipeline Value by Stage')).toBeInTheDocument();
    expect((await screen.findAllByText(/\$71,500/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Highest value: Qualified/)).toBeInTheDocument();
  });

  it('shows an empty state when all pipeline value data is zero', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/pipeline-summary`, () =>
        HttpResponse.json([
          { stage: 'New Lead', count: 0, value: 0 },
          { stage: 'Contacted', count: 0, value: 0 },
          { stage: 'Qualified', count: 0, value: 0 },
          { stage: 'Proposal Sent', count: 0, value: 0 },
          { stage: 'Won', count: 0, value: 0 },
          { stage: 'Lost', count: 0, value: 0 },
        ]),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('No pipeline value yet')).toBeInTheDocument();
    expect(
      screen.getByText('Estimated deal value by stage will appear here once pipeline value is available.'),
    ).toBeInTheDocument();
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
