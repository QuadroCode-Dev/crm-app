import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { setupServer } from 'msw/node';
import AppProviders from '../app/providers/AppProviders.jsx';
import { createTestRouter } from '../app/router.jsx';
import { clearAuthSession, setAuthSession } from './auth/authSession.js';
import { mockAccessToken, mockAuthUser } from '../shared/mocks/authMockData.js';
import { handlers, resetMockState } from '../shared/mocks/handlers.js';

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

function authenticate() {
  setAuthSession({
    accessToken: mockAccessToken,
    user: mockAuthUser,
  });
}

describe('CRM forms', () => {
  it('validates the create contact form', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/contacts']);

    await screen.findByRole('heading', { name: 'Contacts' });
    await user.click(screen.getByRole('button', { name: 'Add contact' }));
    await user.click(screen.getByRole('button', { name: 'Create contact' }));

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument();
  });

  it('validates the create lead form', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/leads']);

    await screen.findByRole('heading', { name: 'Leads' });
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    await user.click(screen.getByRole('button', { name: 'Create lead' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Contact is required.')).toBeInTheDocument();
  });

  it('creates a lead successfully', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/leads']);

    await screen.findByRole('heading', { name: 'Leads' });
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create lead' });

    await user.type(within(dialog).getByLabelText('Title'), 'New HVAC installation');
    await user.selectOptions(within(dialog).getByLabelText('Contact'), 'contact-1');
    await user.selectOptions(within(dialog).getByLabelText('Source'), 'Referral');
    await user.selectOptions(within(dialog).getByLabelText('Pipeline stage'), 'stage-1');
    await user.selectOptions(within(dialog).getByLabelText('Owner'), 'user-1');
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'Open');
    await user.type(within(dialog).getByLabelText('Estimated cost'), '12500');
    await user.type(
      within(dialog).getByLabelText('Service requested'),
      'HVAC installation',
    );
    await user.type(
      within(dialog).getByLabelText('Message'),
      'Customer wants a site visit next week.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create lead' }));

    expect(await screen.findByText('Lead created successfully.')).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByText('New HVAC installation')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  }, 10000);

  it('edits a lead successfully', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/leads/lead-1']);

    await screen.findByRole('heading', { name: 'Solar rooftop installation' });
    await user.click(screen.getByRole('button', { name: 'Edit lead' }));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Solar rooftop installation - revised');
    await user.click(screen.getByRole('button', { name: 'Save lead' }));

    expect(await screen.findByText('Lead updated successfully.')).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByText('Solar rooftop installation - revised')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  }, 10000);

  it('shows delete confirmation before removing a lead', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/leads/lead-1']);

    const heading = await screen.findByRole('heading', { name: 'Solar rooftop installation' });
    const pageHeader = heading.closest('.crm-page-header');
    await user.click(within(pageHeader).getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete lead?' });
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete lead' }));

    await waitFor(() => {
      expect(screen.getByText('Lead deleted successfully.')).toBeInTheDocument();
    });
  });
});
