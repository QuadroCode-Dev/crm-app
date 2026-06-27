import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import AppProviders from '../../app/providers/AppProviders.jsx';
import { createTestRouter } from '../../app/router.jsx';
import { handlers, resetMockState } from '../../shared/mocks/handlers.js';
import { LANDING_SUCCESS_STORAGE_KEY } from './landingStorage.js';

const apiBaseUrl = 'http://localhost:5000';
const server = setupServer(...handlers);

function renderRoute(initialEntries) {
  const router = createTestRouter(initialEntries);

  const view = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { router, ...view };
}

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  resetMockState();
  window.localStorage.clear();
  window.sessionStorage.clear();
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('Landing feature', () => {
  async function selectService(user, name = 'Plastic Surgery') {
    await user.click(screen.getByLabelText('Service requested'));
    await user.click(await screen.findByRole('option', { name }));
  }

  it('validates the landing form', async () => {
    const user = userEvent.setup();

    renderRoute(['/landing']);

    await screen.findByRole('heading', { name: 'Request a callback' });
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('Provide at least an email or phone number.')).toBeInTheDocument();
  });

  it('collects UTM fields from the URL and submits them to the public endpoint', async () => {
    const user = userEvent.setup();
    let capturedPayload = null;

    server.use(
      http.post(`${apiBaseUrl}/api/public/lead-capture`, async ({ request }) => {
        capturedPayload = await request.json();

        return HttpResponse.json(
          {
            success: true,
            trackingId: 'tracking-123',
            message: 'Lead received successfully',
          },
          { status: 201 },
        );
      }),
    );

    const { container } = renderRoute([
      '/landing?utm_source=google&utm_medium=cpc&utm_campaign=summer-2026',
    ]);

    await screen.findByRole('heading', { name: 'Request a callback' });

    expect(container.querySelector('input[aria-label="UTM source"]')).toHaveValue('google');
    expect(container.querySelector('input[aria-label="UTM medium"]')).toHaveValue('cpc');
    expect(container.querySelector('input[aria-label="UTM campaign"]')).toHaveValue(
      'summer-2026',
    );

    await user.type(screen.getByLabelText('Full name'), 'Zeynep Kara');
    await user.type(screen.getByLabelText('Email'), 'zeynep@example.com');
    await selectService(user, 'Plastic Surgery');
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => {
      expect(capturedPayload).not.toBeNull();
    });

    expect(capturedPayload.utmSource).toBe('google');
    expect(capturedPayload.utmMedium).toBe('cpc');
    expect(capturedPayload.utmCampaign).toBe('summer-2026');
    expect(capturedPayload.serviceRequested).toBe('Plastic Surgery');
    expect(capturedPayload.estimatedCost).toBe(2500);
    expect(capturedPayload.pageUrl).toContain('/landing?utm_source=google&utm_medium=cpc&utm_campaign=summer-2026');
  });

  it('redirects to the success screen after a successful submission', async () => {
    const user = userEvent.setup();

    renderRoute(['/landing']);

    await screen.findByRole('heading', { name: 'Request a callback' });
    await user.type(screen.getByLabelText('Full name'), 'Zeynep Kara');
    await user.type(screen.getByLabelText('Phone'), '905552223344');
    await selectService(user, 'Rhinoplasty');
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(
      await screen.findByRole('heading', { name: 'Thanks, we received your request.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tracking ID:/)).toBeInTheDocument();
    expect(window.sessionStorage.getItem(LANDING_SUCCESS_STORAGE_KEY)).toContain('trackingId');
  });

  it('shows a friendly error message when the API fails', async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${apiBaseUrl}/api/public/lead-capture`, () =>
        HttpResponse.json(
          {
            message: 'Service unavailable.',
          },
          {
            status: 500,
          },
        ),
      ),
    );

    renderRoute(['/landing']);

    await screen.findByRole('heading', { name: 'Request a callback' });
    await user.type(screen.getByLabelText('Full name'), 'Zeynep Kara');
    await user.type(screen.getByLabelText('Phone'), '905552223344');
    await selectService(user);
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(
      await screen.findByText('We could not send your request right now. Please try again in a moment.'),
    ).toBeInTheDocument();
  });

  it('validates public landing input formats', async () => {
    const user = userEvent.setup();

    renderRoute(['/landing']);

    await screen.findByRole('heading', { name: 'Request a callback' });
    await user.type(screen.getByLabelText('Full name'), 'Zeynep 123');
    await user.type(screen.getByLabelText('Email'), 'ziadk@ff');
    await user.type(screen.getByLabelText('Phone'), '90555abc');
    await selectService(user);
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(screen.getByLabelText('Full name')).toHaveValue('Zeynep ');
    expect(screen.getByLabelText('Phone')).toHaveValue('90555');
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('renders a hidden honeypot field', async () => {
    const { container } = renderRoute(['/landing']);

    await screen.findByRole('heading', { name: 'Request a callback' });

    const honeypot = container.querySelector('[data-testid="landing-honeypot"]');

    expect(honeypot).toBeInTheDocument();
    expect(honeypot).toHaveAttribute('type', 'hidden');
  });
});
