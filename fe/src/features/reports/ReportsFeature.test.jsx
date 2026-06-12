import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('Reports feature', () => {
  it('renders the reports page and main sections', async () => {
    authenticate();

    renderRoute(['/reports']);

    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument();
    expect(await screen.findByText('Tracked leads')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Leads by source' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pipeline summary' })).toBeInTheDocument();
  });

  it('renders the leads by source report data', async () => {
    authenticate();

    renderRoute(['/reports']);

    expect(await screen.findByText('Lead source performance')).toBeInTheDocument();
    expect(screen.getAllByText('Landing Page').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Referral').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$18,500').length).toBeGreaterThan(0);
  });

  it('updates query state from the report filters', async () => {
    const user = userEvent.setup();
    authenticate();

    const { router } = renderRoute(['/reports']);

    await screen.findByRole('heading', { name: 'Reports' });
    await user.type(screen.getByLabelText('Date from'), '2026-05-01');
    await user.selectOptions(screen.getByLabelText('Source'), 'Landing Page');
    await user.selectOptions(screen.getByLabelText('Owner'), 'user-1');

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('dateFrom')).toBe('2026-05-01');
      expect(params.get('sourceId')).toBe('Landing Page');
      expect(params.get('ownerUserId')).toBe('user-1');
    });
  });

  it('shows a loading state while report queries are in flight', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/leads-by-source`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json([]);
      }),
    );

    renderRoute(['/reports']);

    expect(document.querySelector('.crm-loading-state')).not.toBeNull();
    await screen.findByRole('heading', { name: 'Reports' });
  });

  it('shows an error state when a report request fails', async () => {
    authenticate();

    server.use(
      http.get(`${apiBaseUrl}/api/reports/pipeline-summary`, () =>
        HttpResponse.json(
          { message: 'Pipeline summary unavailable.' },
          { status: 500 },
        ),
      ),
    );

    renderRoute(['/reports']);

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByText(/Unable to load reports\./)).toBeInTheDocument();
    expect(screen.getByText(/Pipeline summary unavailable\./)).toBeInTheDocument();
  });
});
