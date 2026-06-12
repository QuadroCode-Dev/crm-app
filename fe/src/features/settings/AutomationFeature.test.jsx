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

describe('Automation feature', () => {
  it('renders the automation rules list', async () => {
    authenticate();

    renderRoute(['/settings/automation']);

    expect(await screen.findByRole('heading', { name: 'Automation rules' })).toBeInTheDocument();
    expect(await screen.findByText('Create follow-up task on qualification')).toBeInTheDocument();
    expect(screen.getAllByText('Trigger: StageChanged')).toHaveLength(2);
  });

  it('validates the create automation rule form', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/settings/automation']);

    await screen.findByRole('heading', { name: 'Automation rules' });
    await user.click(screen.getByRole('button', { name: 'Add automation rule' }));
    await user.click(screen.getByRole('button', { name: 'Create rule' }));

    expect(await screen.findByText('Rule name is required.')).toBeInTheDocument();
    expect(screen.getByText('Target stage is required.')).toBeInTheDocument();
    expect(screen.getByText('Task title template is required.')).toBeInTheDocument();
  });

  it('edits an automation rule successfully', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/settings/automation']);

    await screen.findByRole('heading', { name: 'Automation rules' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit automation rule' });
    const nameInput = within(dialog).getByLabelText('Rule name');

    await user.clear(nameInput);
    await user.type(nameInput, 'Create proposal follow-up task');
    await user.click(within(dialog).getByRole('button', { name: 'Save rule' }));

    expect(await screen.findByText('Automation rule updated successfully.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Create proposal follow-up task')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation before removing a rule', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/settings/automation']);

    await screen.findByRole('heading', { name: 'Automation rules' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete automation rule?' });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete rule' }));

    expect(await screen.findByText('Automation rule deleted successfully.')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText('Create follow-up task on qualification'),
      ).not.toBeInTheDocument();
    });
  });
});
