import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

describe('Integrations feature', () => {
  it('renders the landing page integration details', async () => {
    authenticate();

    renderRoute(['/settings/integrations']);

    expect(await screen.findByRole('heading', { name: 'Integrations' })).toBeInTheDocument();
    expect(screen.getByText('Landing page lead capture')).toBeInTheDocument();
    expect(
      screen.getByText('http://localhost:5000/api/public/lead-capture'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open landing page' })).toHaveAttribute(
      'href',
      '/landing',
    );
    expect(screen.getByText('Google lead forms')).toBeInTheDocument();
    expect(screen.getByText('Meta / Facebook lead forms')).toBeInTheDocument();
  });
});
