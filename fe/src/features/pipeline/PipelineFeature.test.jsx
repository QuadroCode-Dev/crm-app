import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { setupServer } from 'msw/node';
import AppProviders from '../../app/providers/AppProviders.jsx';
import { createTestRouter } from '../../app/router.jsx';
import { clearAuthSession, setAuthSession } from '../auth/authSession.js';
import { mockAccessToken, mockAuthUser } from '../../shared/mocks/authMockData.js';
import { handlers, resetMockState } from '../../shared/mocks/handlers.js';
import { applyPipelineDragEnd } from './PipelinePage.jsx';

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

describe('Pipeline feature', () => {
  it('renders pipeline columns and lead cards in their current stage', async () => {
    authenticate();

    renderRoute(['/pipeline']);

    expect(await screen.findByRole('heading', { name: 'Deals' })).toBeInTheDocument();

    const qualifiedColumn = screen.getByText('Qualified').closest('.crm-pipeline-column');
    const proposalColumn = screen.getByText('Proposal').closest('.crm-pipeline-column');

    expect(within(qualifiedColumn).getByText('Solar rooftop installation')).toBeInTheDocument();
    expect(within(proposalColumn).getByText('Kitchen remodel consultation')).toBeInTheDocument();
  });

  it('maps drag end into a stage-change callback', () => {
    const onStageChange = vi.fn();

    const changed = applyPipelineDragEnd({
      activeId: 'lead-card-lead-1',
      overId: 'stage-drop-stage-3',
      leadStageMap: {
        'lead-1': 'stage-2',
      },
      onStageChange,
    });

    expect(changed).toBe(true);
    expect(onStageChange).toHaveBeenCalledWith({
      leadId: 'lead-1',
      stageId: 'stage-3',
    });
  });

  it('renders the stage settings list', async () => {
    authenticate();

    renderRoute(['/settings/pipeline']);

    expect(await screen.findByRole('heading', { name: 'Pipeline stages' })).toBeInTheDocument();
    expect(screen.getByText('Incoming')).toBeInTheDocument();
    expect(screen.getByText('Qualified')).toBeInTheDocument();
  });

  it('validates the create stage form', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/settings/pipeline']);

    await screen.findByRole('heading', { name: 'Pipeline stages' });
    await user.click(screen.getByRole('button', { name: 'Add stage' }));
    await user.click(screen.getByRole('button', { name: 'Create stage' }));

    expect(await screen.findByText('Stage name is required.')).toBeInTheDocument();
  });

  it('edits a stage successfully', async () => {
    const user = userEvent.setup();
    authenticate();

    renderRoute(['/settings/pipeline']);

    await screen.findByRole('heading', { name: 'Pipeline stages' });
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    const dialog = await screen.findByRole('dialog', { name: 'Edit stage' });
    const nameInput = within(dialog).getByLabelText('Stage name');

    await user.clear(nameInput);
    await user.type(nameInput, 'Inbound');
    await user.click(within(dialog).getByRole('button', { name: 'Save stage' }));

    expect(await screen.findByText('Stage updated successfully.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Inbound')).toBeInTheDocument();
    });
  });

  it('renders the stage timer in lead detail', async () => {
    authenticate();

    renderRoute(['/leads/lead-1']);

    expect(
      await screen.findByRole('heading', { name: 'Solar rooftop installation' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Stage timer')).toBeInTheDocument();
    expect(screen.getByText('Days in current stage')).toBeInTheDocument();
    expect(screen.getByText('Previous stages')).toBeInTheDocument();
    expect(screen.getByText('Incoming')).toBeInTheDocument();
  });
});
