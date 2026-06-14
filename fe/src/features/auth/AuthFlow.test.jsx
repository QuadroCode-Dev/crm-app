import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import AppProviders from '../../app/providers/AppProviders.jsx';
import { createTestRouter } from '../../app/router.jsx';
import { clearAuthSession, setAuthSession } from './authSession.js';
import {
  mockAccessToken,
  mockAuthCredentials,
  mockRefreshToken,
  mockAuthUser,
} from '../../shared/mocks/authMockData.js';

const apiBaseUrl = 'http://localhost:5000';

let isAuthenticated = false;
let loginShouldFail = false;

const server = setupServer(
  http.get(`${apiBaseUrl}/api/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('authorization');

    if (isAuthenticated || authHeader === `Bearer ${mockAccessToken}`) {
      return HttpResponse.json(mockAuthUser);
    }

    return HttpResponse.json(
      {
        message: 'Unauthorized',
      },
      {
        status: 401,
      },
    );
  }),
  http.post(`${apiBaseUrl}/api/auth/login`, async ({ request }) => {
    const body = await request.json();

    if (
      loginShouldFail ||
      body.email !== mockAuthCredentials.email ||
      body.password !== mockAuthCredentials.password
    ) {
      return HttpResponse.json(
        {
          message: 'Invalid email or password.',
        },
        {
          status: 401,
        },
      );
    }

    isAuthenticated = true;

    return HttpResponse.json({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      user: mockAuthUser,
    });
  }),
  http.post(`${apiBaseUrl}/api/auth/refresh`, () =>
    HttpResponse.json(
      {
        message: 'Refresh unavailable',
      },
      {
        status: 401,
      },
    ),
  ),
  http.post(`${apiBaseUrl}/api/auth/logout`, () => {
    isAuthenticated = false;
    return HttpResponse.json({
      success: true,
    });
  }),
  http.get(`${apiBaseUrl}/api/leads`, () =>
    HttpResponse.json({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 100,
    }),
  ),
  http.get(`${apiBaseUrl}/api/tasks`, () =>
    HttpResponse.json({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 100,
    }),
  ),
  http.get(`${apiBaseUrl}/api/pipeline/stages`, () => HttpResponse.json([])),
  http.get(`${apiBaseUrl}/api/reports/leads-by-source`, () => HttpResponse.json([])),
  http.get(`${apiBaseUrl}/api/reports/pipeline-summary`, () => HttpResponse.json([])),
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

function renderRoute(initialEntries) {
  const router = createTestRouter(initialEntries);

  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

function setScreenWidth({ isDesktop }) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('min-width') ? isDesktop : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

function seedAuthenticatedSession() {
  isAuthenticated = true;
  setAuthSession({
    accessToken: mockAccessToken,
    refreshToken: mockRefreshToken,
    user: mockAuthUser,
  });
}

async function waitForLoginPage() {
  return screen.findByRole('heading', {
    name: 'Login',
  });
}

async function waitForDashboardPage() {
  return screen.findByRole('button', {
    name: 'Logout',
  });
}

beforeAll(() => {
  setScreenWidth({ isDesktop: true });
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  setScreenWidth({ isDesktop: true });
  isAuthenticated = false;
  loginShouldFail = false;
  clearAuthSession();
  window.localStorage.clear();
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});

describe('Auth flow', () => {
  it('validates the login form', async () => {
    const user = userEvent.setup();

    renderRoute(['/login']);
    await waitForLoginPage();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
  });

  it('completes a successful login flow', async () => {
    const user = userEvent.setup();

    renderRoute(['/login']);
    await waitForLoginPage();

    await user.type(screen.getByLabelText('Email'), mockAuthCredentials.email);
    await user.type(screen.getByLabelText('Password'), mockAuthCredentials.password);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await waitForDashboardPage()).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    expect(window.localStorage.getItem('crm.auth.accessToken')).toBe(mockAccessToken);
    expect(window.localStorage.getItem('crm.auth.refreshToken')).toBe(mockRefreshToken);
  });

  it('completes a successful login flow when Arabic is selected', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('crm.preferences.language', 'ar');

    renderRoute(['/login']);

    expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'اللغة' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('البريد الإلكتروني'), mockAuthCredentials.email);
    await user.type(screen.getByLabelText('كلمة المرور'), mockAuthCredentials.password);
    await user.click(screen.getByRole('button', { name: 'دخول' }));

    expect(await screen.findByRole('button', { name: 'تسجيل الخروج' })).toBeInTheDocument();
    expect(window.localStorage.getItem('crm.auth.accessToken')).toBe(mockAccessToken);
    expect(window.localStorage.getItem('crm.auth.refreshToken')).toBe(mockRefreshToken);
  });

  it('shows an error when login fails', async () => {
    const user = userEvent.setup();
    loginShouldFail = true;

    renderRoute(['/login']);
    await waitForLoginPage();

    await user.type(screen.getByLabelText('Email'), mockAuthCredentials.email);
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Invalid email or password.'),
    ).toBeInTheDocument();
  });

  it('redirects protected routes when unauthenticated', async () => {
    renderRoute(['/dashboard']);

    expect(
      await screen.findByRole('heading', {
        name: 'Login',
      }),
    ).toBeInTheDocument();
  });

  it('redirects authenticated users away from login', async () => {
    seedAuthenticatedSession();

    renderRoute(['/login']);

    expect(await waitForDashboardPage()).toBeInTheDocument();
  });

  it('shows sidebar navigation links for authenticated users', async () => {
    seedAuthenticatedSession();

    renderRoute(['/dashboard']);

    await waitForDashboardPage();

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.getByRole('link', { name: 'Pipeline' })).toHaveAttribute(
      'href',
      '/pipeline',
    );
    expect(screen.getByRole('link', { name: 'Leads' })).toHaveAttribute(
      'href',
      '/leads',
    );
    expect(screen.getByRole('link', { name: 'Contacts' })).toHaveAttribute(
      'href',
      '/contacts',
    );
    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute(
      'href',
      '/tasks',
    );
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute(
      'href',
      '/reports',
    );
  });

  it('opens and closes the sidebar from a hamburger menu on smaller screens', async () => {
    const user = userEvent.setup();
    seedAuthenticatedSession();
    setScreenWidth({ isDesktop: false });

    renderRoute(['/dashboard']);

    await waitForDashboardPage();

    expect(screen.queryByRole('link', { name: 'Pipeline' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(await screen.findByRole('link', { name: 'Pipeline' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Pipeline' }));

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    });
  });

  it('logs out from the topbar', async () => {
    const user = userEvent.setup();
    seedAuthenticatedSession();

    renderRoute(['/dashboard']);

    await user.click(await screen.findByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Login',
        }),
      ).toBeInTheDocument();
    });
  });
});
