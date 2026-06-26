import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import dayjs from 'dayjs';
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

  it('renders lead source performance with ranked marketing metrics', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/leads-by-source`, () =>
        HttpResponse.json([
          { source: 'Google Ads', leads: 120, won: 18, revenue: 42000 },
          { source: 'Facebook', leads: 200, won: 10, revenue: 18000 },
          { source: 'Website Form', leads: 75, won: 14, revenue: 31000 },
          { source: 'Referral', leads: 30, won: 9, revenue: 26000 },
        ]),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Lead Source Performance')).toBeInTheDocument();
    expect(await screen.findByText('Google Ads')).toBeInTheDocument();
    expect(screen.getByText('Website Form')).toBeInTheDocument();
    expect(screen.getAllByText('Referral').length).toBeGreaterThan(0);
    expect(screen.getByText('18.7%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText(/Most leads: Facebook/)).toBeInTheDocument();
    expect(screen.getByText(/Best conversion: Referral/)).toBeInTheDocument();
  });

  it('handles lead source rows with zero leads safely', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/leads-by-source`, () =>
        HttpResponse.json([
          { source: 'Manual Entry', leads: 0, won: 0, revenue: 0 },
          { source: 'WhatsApp', leads: 12, won: 3, revenue: 9000 },
        ]),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Lead Source Performance')).toBeInTheDocument();
    expect(await screen.findByText('Manual Entry')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('renders follow-up health with urgent sales execution issues', async () => {
    authenticate();

    const now = dayjs();
    const overdueTasks = Array.from({ length: 8 }, (_, index) => ({
      id: `overdue-task-${index}`,
      title: `Overdue follow-up ${index + 1}`,
      status: 'Open',
      priority: 'High',
      dueDateUtc: now.subtract(1, 'day').toISOString(),
      isCompleted: false,
    }));
    const dueTodayTasks = Array.from({ length: 14 }, (_, index) => ({
      id: `today-task-${index}`,
      title: `Today follow-up ${index + 1}`,
      status: 'Open',
      priority: 'Medium',
      dueDateUtc: now.toISOString(),
      isCompleted: false,
    }));
    const newLeads = Array.from({ length: 5 }, (_, index) => ({
      id: `new-lead-${index}`,
      title: `New lead ${index + 1}`,
      status: 'New',
      ownerName: 'Sales Owner',
      estimatedCost: 12000,
      createdAtUtc: now.subtract(2, 'hour').toISOString(),
      updatedAtUtc: now.subtract(2, 'hour').toISOString(),
    }));
    const inactiveHighValueLeads = Array.from({ length: 3 }, (_, index) => ({
      id: `inactive-lead-${index}`,
      title: `Inactive high-value lead ${index + 1}`,
      status: 'Open',
      ownerName: 'Sales Owner',
      estimatedCost: 80000,
      firstResponseMinutes: 155,
      createdAtUtc: now.subtract(10, 'day').toISOString(),
      updatedAtUtc: now.subtract(8, 'day').toISOString(),
    }));

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [...newLeads, ...inactiveHighValueLeads],
          total: 8,
          page: 1,
          pageSize: 100,
        }),
      ),
      http.get(`${apiBaseUrl}/api/tasks`, () =>
        HttpResponse.json({
          items: [...overdueTasks, ...dueTodayTasks],
          total: 22,
          page: 1,
          pageSize: 100,
        }),
      ),
      http.get(`${apiBaseUrl}/api/reports/tasks-summary`, () =>
        HttpResponse.json({
          totalTasks: 22,
          pendingTasks: 22,
          completedTasks: 0,
          overdueTasks: 8,
          tasksByPriority: [],
        }),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Follow-up Health')).toBeInTheDocument();
    expect(screen.getAllByText('Needs attention today').length).toBeGreaterThan(0);
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('Due Today')).toBeInTheDocument();
    expect(screen.getByText('No Activity Leads')).toBeInTheDocument();
    expect(screen.getByText('Avg. First Response Time')).toBeInTheDocument();
    expect(await screen.findByText('2h 35m')).toBeInTheDocument();
    expect(screen.getByText('overdue follow-ups')).toBeInTheDocument();
    expect(screen.getByText('new leads not contacted')).toBeInTheDocument();
    expect(screen.getByText('high-value leads inactive for 7+ days')).toBeInTheDocument();
  });

  it('shows a healthy follow-up state when sales execution has no issues', async () => {
    authenticate();

    const now = dayjs();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'healthy-lead',
              title: 'Healthy lead',
              status: 'Open',
              ownerName: 'Sales Owner',
              estimatedCost: 12000,
              firstResponseMinutes: 30,
              createdAtUtc: now.subtract(2, 'hour').toISOString(),
              updatedAtUtc: now.subtract(1, 'hour').toISOString(),
            },
          ],
          total: 1,
          page: 1,
          pageSize: 100,
        }),
      ),
      http.get(`${apiBaseUrl}/api/tasks`, () =>
        HttpResponse.json({
          items: [],
          total: 0,
          page: 1,
          pageSize: 100,
        }),
      ),
      http.get(`${apiBaseUrl}/api/reports/tasks-summary`, () =>
        HttpResponse.json({
          totalTasks: 0,
          pendingTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          tasksByPriority: [],
        }),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Follow-up Health')).toBeInTheDocument();
    expect(await screen.findByText('Healthy')).toBeInTheDocument();
    expect(await screen.findByText('Follow-ups are under control')).toBeInTheDocument();
    expect(
      screen.getByText('No overdue follow-ups, ignored new leads, or inactive high-value leads need action right now.'),
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
