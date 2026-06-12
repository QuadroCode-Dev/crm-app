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

describe('Lead activity feature', () => {
  it('renders the notes list', async () => {
    authenticate();

    renderRoute(['/leads/lead-1']);

    expect(
      await screen.findByRole('heading', { name: 'Solar rooftop installation' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Confirmed budget range and timeline for June.')).toBeInTheDocument();
  });

  it('creates a note successfully', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/leads/lead-1']);

    await screen.findByRole('heading', { name: 'Solar rooftop installation' });
    await user.click(screen.getByRole('button', { name: 'Add note' }));

    const dialog = await screen.findByRole('dialog', { name: 'Add note' });
    await user.type(within(dialog).getByLabelText('Note'), 'Booked the follow-up call for Friday.');
    await user.click(within(dialog).getByRole('button', { name: 'Create note' }));

    expect(await screen.findByText('Note created successfully.')).toBeInTheDocument();
    expect(await screen.findByText('Booked the follow-up call for Friday.')).toBeInTheDocument();
  });

  it('edits a note successfully', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/leads/lead-1']);

    await screen.findByRole('heading', { name: 'Solar rooftop installation' });
    const notesHeader = await screen.findByText('Notes');
    const notesSection = notesHeader.closest('.crm-lead-detail__section');
    await user.click(within(notesSection).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit note' });
    const input = within(dialog).getByLabelText('Note');

    await user.clear(input);
    await user.type(input, 'Confirmed budget range, timeline, and installer access.');
    await user.click(within(dialog).getByRole('button', { name: 'Save note' }));

    expect(await screen.findByText('Note updated successfully.')).toBeInTheDocument();
    expect(
      await screen.findByText('Confirmed budget range, timeline, and installer access.'),
    ).toBeInTheDocument();
  });

  it('deletes a note successfully', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/leads/lead-1']);

    await screen.findByRole('heading', { name: 'Solar rooftop installation' });
    const notesHeader = await screen.findByText('Notes');
    const notesSection = notesHeader.closest('.crm-lead-detail__section');
    await user.click(within(notesSection).getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete note?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete note' }));

    expect(await screen.findByText('Note deleted successfully.')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText('Confirmed budget range and timeline for June.'),
      ).not.toBeInTheDocument();
    });
  });

  it('renders timeline newest first', async () => {
    authenticate();

    renderRoute(['/leads/lead-1']);

    await screen.findByRole('heading', { name: 'Solar rooftop installation' });

    const timeline = await screen.findByText('Activity timeline');
    const timelineCard = timeline.closest('.crm-lead-detail__section');
    const items = within(timelineCard).getAllByText(/Moved to Qualified|Potential duplicate found|Lead created/);

    expect(items[0]).toHaveTextContent('Moved to Qualified');
    expect(items[1]).toHaveTextContent('Potential duplicate found');
    expect(items[2]).toHaveTextContent('Lead created');
  });

  it('shows the duplicate warning banner and matched records', async () => {
    authenticate();

    renderRoute(['/leads/lead-1']);

    await screen.findByRole('heading', { name: 'Solar rooftop installation' });

    expect(
      await screen.findByText(/Duplicate warning detected for this lead/i),
    ).toBeInTheDocument();
    expect(await screen.findByText('Matched contacts')).toBeInTheDocument();
    expect(await screen.findByText('Matched leads')).toBeInTheDocument();
    expect(await screen.findByText('Existing solar estimate')).toBeInTheDocument();
    expect(await screen.findByText('Matched on email')).toBeInTheDocument();
    expect(await screen.findByText('Matched on phone')).toBeInTheDocument();
  });
});
