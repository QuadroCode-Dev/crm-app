import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
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

describe('Tasks feature', () => {
  it('renders the task list', async () => {
    authenticate();

    renderRoute(['/tasks']);

    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    expect(await screen.findByText('Call customer about site inspection')).toBeInTheDocument();
    expect(screen.getByText('Prepare proposal deck')).toBeInTheDocument();
  });

  it('renders tasks when the API returns a bare task array', async () => {
    authenticate();
    server.use(
      http.get('*/api/tasks', () =>
        HttpResponse.json([
          {
            id: 'task-array-1',
            leadId: 'lead-1',
            contactId: 'contact-1',
            assignedToUserId: 'user-1',
            assignedToUserFullName: 'Ziad Ali',
            title: 'Whatsapp Call',
            dueAtUtc: '2026-06-29T20:59:59.000Z',
            priority: 'Medium',
            status: 'Pending',
            createdAtUtc: '2026-06-28T10:00:00.000Z',
            updatedAtUtc: null,
            completedAtUtc: null,
          },
        ]),
      ),
    );

    renderRoute(['/tasks']);

    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    expect(await screen.findByText('Whatsapp Call')).toBeInTheDocument();
    expect(screen.getByText('Ziad Ali')).toBeInTheDocument();
  });

  it('updates query state from filters', async () => {
    const user = userEvent.setup();
    authenticate();

    const { router } = renderRoute(['/tasks']);

    await screen.findByRole('heading', { name: 'Tasks' });
    await user.selectOptions(screen.getByLabelText('Assigned user'), 'user-1');
    await user.selectOptions(screen.getByLabelText('Priority'), 'High');
    await user.click(screen.getByLabelText('Overdue only'));

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get('assignedUserId')).toBe('user-1');
      expect(params.get('priority')).toBe('High');
      expect(params.get('overdueOnly')).toBe('true');
    });
  });

  it('validates the create task form', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/tasks']);

    await screen.findByRole('heading', { name: 'Tasks' });
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText('Task title is required.')).toBeInTheDocument();
    expect(screen.getByText('Assigned user is required.')).toBeInTheDocument();
    expect(screen.getByText('Due date is required.')).toBeInTheDocument();
  });

  it('completes a task successfully', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/tasks']);

    await screen.findByRole('heading', { name: 'Tasks' });
    await user.click(screen.getAllByRole('button', { name: 'Complete' })[0]);

    expect(await screen.findByText('Task completed successfully.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Complete' })).toHaveLength(1);
    });
  });

  it('shows delete confirmation before removing a task', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/tasks']);

    await screen.findByRole('heading', { name: 'Tasks' });
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    const dialog = await screen.findByRole('dialog', { name: 'Delete task?' });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Task deleted successfully.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Call customer about site inspection')).not.toBeInTheDocument();
    });
  });

  it('shows related tasks in the lead detail page', async () => {
    authenticate();

    renderRoute(['/leads/lead-1']);

    await screen.findByRole('heading', { name: 'Solar rooftop installation' });
    expect(await screen.findByText('Related tasks')).toBeInTheDocument();
    expect(await screen.findByText('Call customer about site inspection')).toBeInTheDocument();
  });
});
