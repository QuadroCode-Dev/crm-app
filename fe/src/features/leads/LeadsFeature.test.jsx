import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { setupServer } from 'msw/node';
import AppProviders from '../../app/providers/AppProviders.jsx';
import { createTestRouter } from '../../app/router.jsx';
import { clearAuthSession, setAuthSession } from '../auth/authSession.js';
import { mockAccessToken, mockAuthUser } from '../../shared/mocks/authMockData.js';
import { handlers, resetMockState } from '../../shared/mocks/handlers.js';

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

describe('Leads feature', () => {
  it('renders the leads table and duplicate badge', async () => {
    setAuthSession({
      accessToken: mockAccessToken,
      user: mockAuthUser,
    });

    renderRoute(['/leads']);

    expect(
      await screen.findByRole('heading', {
        name: 'Leads',
      }),
    ).toBeInTheDocument();

    expect(await screen.findByText('Solar rooftop installation')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  it('updates query state from search and filters', async () => {
    const user = userEvent.setup();

    setAuthSession({
      accessToken: mockAccessToken,
      user: mockAuthUser,
    });

    const { router } = renderRoute(['/leads']);

    await screen.findByRole('heading', {
      name: 'Leads',
    });

    await user.clear(screen.getByLabelText('Search'));
    await user.type(screen.getByLabelText('Search'), 'solar');
    await user.selectOptions(screen.getByLabelText('Source'), 'Landing Page');
    await user.selectOptions(screen.getByLabelText('Status'), 'Open');

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('search')).toBe('solar');
      expect(params.get('source')).toBe('Landing Page');
      expect(params.get('status')).toBe('Open');
    });
  });

  it('renders the lead detail page', async () => {
    setAuthSession({
      accessToken: mockAccessToken,
      user: mockAuthUser,
    });

    renderRoute(['/leads/lead-1']);

    expect(
      await screen.findByRole('heading', {
        name: 'Solar rooftop installation',
      }),
    ).toBeInTheDocument();

    const summarySection = screen.getByText('Lead summary').closest('.crm-lead-detail__summary');
    expect(within(summarySection).getByText('Elif Yilmaz')).toBeInTheDocument();
    expect(screen.getByText('Residential solar installation')).toBeInTheDocument();
    expect(screen.getByText(/Duplicate warning detected/i)).toBeInTheDocument();
  });
});
