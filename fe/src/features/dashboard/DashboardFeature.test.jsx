import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it('renders leads needing attention as a prioritized action queue', async () => {
    authenticate();

    const now = dayjs();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'attention-overdue',
              title: 'Noor Clinic',
              status: 'Open',
              stageName: 'Qualified',
              ownerName: 'Omar',
              estimatedCost: 8000,
              createdAtUtc: now.subtract(4, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
            {
              id: 'attention-unassigned',
              title: 'ABC Company',
              status: 'Open',
              stageName: 'New Lead',
              ownerName: '',
              estimatedCost: 2000,
              createdAtUtc: now.subtract(1, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'hour').toISOString(),
            },
            {
              id: 'attention-new',
              title: 'Fresh Website Lead',
              status: 'New',
              stageName: 'New Lead',
              ownerName: 'Lina',
              estimatedCost: 3200,
              createdAtUtc: now.subtract(2, 'hour').toISOString(),
              updatedAtUtc: now.subtract(2, 'hour').toISOString(),
            },
            {
              id: 'attention-high-value',
              title: 'Ahmed Khaled',
              status: 'Open',
              stageName: 'Proposal Sent',
              ownerName: 'Sara',
              estimatedCost: 75000,
              createdAtUtc: now.subtract(14, 'day').toISOString(),
              updatedAtUtc: now.subtract(8, 'day').toISOString(),
            },
            {
              id: 'attention-stuck',
              title: 'Slow Moving Deal',
              status: 'Open',
              stageName: 'Contacted',
              ownerName: 'Maya',
              estimatedCost: 4500,
              daysInCurrentStage: 12,
              createdAtUtc: now.subtract(12, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'hour').toISOString(),
            },
          ],
          total: 5,
          page: 1,
          pageSize: 100,
        }),
      ),
      http.get(`${apiBaseUrl}/api/tasks`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'overdue-follow-up',
              leadId: 'attention-overdue',
              title: 'Call Noor Clinic',
              status: 'Open',
              priority: 'High',
              dueDateUtc: now.subtract(1, 'day').toISOString(),
              isCompleted: false,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 100,
        }),
      ),
      http.get(`${apiBaseUrl}/api/reports/tasks-summary`, () =>
        HttpResponse.json({
          totalTasks: 1,
          pendingTasks: 1,
          completedTasks: 0,
          overdueTasks: 1,
          tasksByPriority: [],
        }),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Leads Needing Attention')).toBeInTheDocument();
    expect((await screen.findAllByText('Noor Clinic')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('ABC Company').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fresh Website Lead').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ahmed Khaled').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Slow Moving Deal').length).toBeGreaterThan(0);
    expect(screen.getByText('Follow-up overdue')).toBeInTheDocument();
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
    expect(screen.getByText('Not contacted')).toBeInTheDocument();
    expect(screen.getByText('High-value inactive')).toBeInTheDocument();
    expect(screen.getByText('Stuck in stage 12 days')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Create task' })[0]).toHaveAttribute('href', '/tasks');
    expect(screen.getByRole('link', { name: 'Assign' })).toHaveAttribute('href', '/leads/attention-unassigned');
    expect(screen.getAllByRole('link', { name: 'Open lead' }).length).toBeGreaterThan(0);
  });

  it('shows an empty state when no leads need attention', async () => {
    authenticate();

    const now = dayjs();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'healthy-lead',
              title: 'Healthy pipeline lead',
              status: 'Open',
              stageName: 'Qualified',
              ownerName: 'Sara',
              estimatedCost: 12000,
              daysInCurrentStage: 2,
              createdAtUtc: now.subtract(2, 'day').toISOString(),
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

    expect(await screen.findByText('No urgent leads right now.')).toBeInTheDocument();
    expect(screen.getByText('All visible opportunities are under control.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View all leads' })[0]).toHaveAttribute('href', '/leads');
  });

  it('renders trends and updates the selected dashboard date range', async () => {
    authenticate();

    const now = dayjs();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'trend-lead-today',
              title: 'Today lead',
              status: 'New',
              stageName: 'New Lead',
              ownerName: 'Lina',
              estimatedCost: 12000,
              createdAtUtc: now.subtract(2, 'hour').toISOString(),
              updatedAtUtc: now.subtract(2, 'hour').toISOString(),
            },
            {
              id: 'trend-won-yesterday',
              title: 'Won yesterday',
              status: 'Won',
              stageName: 'Won',
              ownerName: 'Sara',
              estimatedCost: 30000,
              createdAtUtc: now.subtract(2, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
          ],
          total: 2,
          page: 1,
          pageSize: 100,
        }),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Trends')).toBeInTheDocument();
    expect(screen.getByText('Leads Over Time')).toBeInTheDocument();
    expect(screen.getByText('Won Revenue Over Time')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate Over Time')).toBeInTheDocument();

    const todayButton = screen.getByRole('button', { name: 'Today' });
    const monthButton = screen.getByRole('button', { name: 'This Month' });
    const last30DaysButton = screen.getByRole('button', { name: 'Last 30 Days' });
    const customButton = screen.getByRole('button', { name: 'Custom' });

    expect(monthButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(last30DaysButton);
    expect(last30DaysButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(todayButton);
    expect(todayButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(customButton);
    expect(customButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an empty state when trend data is unavailable for the selected range', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [],
          total: 0,
          page: 1,
          pageSize: 100,
        }),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('No trend data yet')).toBeInTheDocument();
    expect(
      screen.getByText('Leads, won revenue, and conversion rate trends will appear once activity exists in this date range.'),
    ).toBeInTheDocument();
  });

  it('renders lost reasons as a ranked analysis with percentages', async () => {
    authenticate();

    const now = dayjs();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'lost-no-response-1',
              title: 'Lost no response 1',
              status: 'Lost',
              stageName: 'Lost',
              lostReason: 'No response',
              estimatedCost: 5000,
              createdAtUtc: now.subtract(8, 'day').toISOString(),
              updatedAtUtc: now.subtract(2, 'day').toISOString(),
            },
            {
              id: 'lost-no-response-2',
              title: 'Lost no response 2',
              status: 'Lost',
              stageName: 'Lost',
              lossReason: 'No response',
              estimatedCost: 7000,
              createdAtUtc: now.subtract(7, 'day').toISOString(),
              updatedAtUtc: now.subtract(2, 'day').toISOString(),
            },
            {
              id: 'lost-price',
              title: 'Lost price',
              status: 'Lost',
              stageName: 'Lost',
              closedReason: 'Price too high',
              estimatedCost: 11000,
              createdAtUtc: now.subtract(6, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
            {
              id: 'lost-not-ready',
              title: 'Lost not ready',
              status: 'Lost',
              stageName: 'Lost',
              lostReasonName: 'Not ready now',
              estimatedCost: 9000,
              createdAtUtc: now.subtract(5, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
            {
              id: 'open-lead',
              title: 'Open lead',
              status: 'Open',
              stageName: 'Qualified',
              lostReason: 'Should not count',
              estimatedCost: 9000,
              createdAtUtc: now.subtract(1, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'hour').toISOString(),
            },
          ],
          total: 5,
          page: 1,
          pageSize: 100,
        }),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Lost Reasons')).toBeInTheDocument();
    expect(await screen.findByText('No response')).toBeInTheDocument();
    expect(await screen.findByText('50% (2)')).toBeInTheDocument();
    expect(await screen.findByText('Price too high')).toBeInTheDocument();
    expect(screen.getAllByText('25% (1)').length).toBeGreaterThan(0);
    expect(await screen.findByText('Not ready now')).toBeInTheDocument();
    expect(screen.getByText(/Total lost leads with reasons/)).toBeInTheDocument();
    expect(screen.getByText(/Top reason: No response/)).toBeInTheDocument();
    expect(screen.queryByText('Should not count')).not.toBeInTheDocument();
  });

  it('shows an empty state when lost leads do not have reasons yet', async () => {
    authenticate();

    const now = dayjs();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'lost-without-reason',
              title: 'Lost without reason',
              status: 'Lost',
              stageName: 'Lost',
              estimatedCost: 5000,
              createdAtUtc: now.subtract(3, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
          ],
          total: 1,
          page: 1,
          pageSize: 100,
        }),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('No lost reason data yet')).toBeInTheDocument();
    expect(
      screen.getByText('Lost reason data will appear after leads are marked as lost with a reason.'),
    ).toBeInTheDocument();
  });

  it('renders team performance for multiple owners', async () => {
    authenticate();

    const now = dayjs();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'sara-won-1',
              title: 'Sara won 1',
              status: 'Won',
              stageName: 'Won',
              ownerUserId: 'sara-id',
              ownerName: 'Sara',
              estimatedCost: 22000,
              firstResponseMinutes: 80,
              createdAtUtc: now.subtract(5, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
            {
              id: 'sara-open-1',
              title: 'Sara open',
              status: 'Open',
              stageName: 'Qualified',
              ownerUserId: 'sara-id',
              ownerName: 'Sara',
              estimatedCost: 9000,
              firstResponseMinutes: 100,
              createdAtUtc: now.subtract(4, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
            {
              id: 'omar-won-1',
              title: 'Omar won 1',
              status: 'Won',
              stageName: 'Won',
              ownerUserId: 'omar-id',
              ownerName: 'Omar',
              estimatedCost: 11000,
              firstResponseMinutes: 190,
              createdAtUtc: now.subtract(4, 'day').toISOString(),
              updatedAtUtc: now.subtract(2, 'day').toISOString(),
            },
            {
              id: 'omar-open-1',
              title: 'Omar open 1',
              status: 'Open',
              stageName: 'Contacted',
              ownerUserId: 'omar-id',
              ownerName: 'Omar',
              estimatedCost: 8000,
              firstResponseMinutes: 170,
              createdAtUtc: now.subtract(3, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
            {
              id: 'omar-open-2',
              title: 'Omar open 2',
              status: 'Open',
              stageName: 'New Lead',
              ownerUserId: 'omar-id',
              ownerName: 'Omar',
              estimatedCost: 7000,
              firstResponseMinutes: 180,
              createdAtUtc: now.subtract(1, 'day').toISOString(),
              updatedAtUtc: now.subtract(1, 'day').toISOString(),
            },
          ],
          total: 5,
          page: 1,
          pageSize: 100,
        }),
      ),
      http.get(`${apiBaseUrl}/api/tasks`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'sara-overdue',
              leadId: 'sara-open-1',
              title: 'Sara overdue',
              assignedUserId: 'sara-id',
              assignedUserName: 'Sara',
              status: 'Open',
              dueDateUtc: now.subtract(1, 'day').toISOString(),
              isCompleted: false,
            },
            {
              id: 'omar-overdue-1',
              leadId: 'omar-open-1',
              title: 'Omar overdue 1',
              assignedUserId: 'omar-id',
              assignedUserName: 'Omar',
              status: 'Open',
              dueDateUtc: now.subtract(1, 'day').toISOString(),
              isCompleted: false,
            },
            {
              id: 'omar-overdue-2',
              leadId: 'omar-open-2',
              title: 'Omar overdue 2',
              assignedUserId: 'omar-id',
              assignedUserName: 'Omar',
              status: 'Open',
              dueDateUtc: now.subtract(2, 'day').toISOString(),
              isCompleted: false,
            },
          ],
          total: 3,
          page: 1,
          pageSize: 100,
        }),
      ),
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Team Performance')).toBeInTheDocument();
    expect((await screen.findAllByText('Sara')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Omar').length).toBeGreaterThan(0);
    expect(screen.getByText('Leads assigned')).toBeInTheDocument();
    expect(screen.getByText('Won leads')).toBeInTheDocument();
    expect(screen.getByText('Conversion rate')).toBeInTheDocument();
    expect(screen.getByText('Avg. first response')).toBeInTheDocument();
    expect(screen.getByText('$22,000')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
    expect(screen.getByText('3h')).toBeInTheDocument();
    expect(screen.getByText(/Top performer: Sara/)).toBeInTheDocument();
  });

  it('shows a helpful team performance state for a single owner', async () => {
    authenticate();

    const now = dayjs();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'solo-owner-lead',
              title: 'Solo owner lead',
              status: 'Open',
              stageName: 'Qualified',
              ownerUserId: 'solo-id',
              ownerName: 'Solo Owner',
              estimatedCost: 12000,
              createdAtUtc: now.subtract(1, 'day').toISOString(),
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
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Team performance needs multiple owners')).toBeInTheDocument();
    expect(
      screen.getByText('This section appears when leads are assigned across multiple salespeople or owners.'),
    ).toBeInTheDocument();
  });

  it('shows a helpful team performance state when owner data is empty', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/leads`, () =>
        HttpResponse.json({
          items: [],
          total: 0,
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
    );

    renderRoute(['/dashboard']);

    expect(await screen.findByText('Team performance needs multiple owners')).toBeInTheDocument();
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
