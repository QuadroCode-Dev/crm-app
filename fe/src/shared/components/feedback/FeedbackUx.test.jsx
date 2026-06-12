import { Button } from '@mui/material';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import NotificationProvider from '../../../app/providers/NotificationProvider.jsx';
import useNotifications from '../../hooks/useNotifications.js';
import LeadFormDialog from '../../../features/leads/LeadFormDialog.jsx';
import TaskFormDialog from '../../../features/tasks/TaskFormDialog.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import ErrorState from './ErrorState.jsx';
import LoadingState from './LoadingState.jsx';

function NotificationHarness() {
  const { showNotification } = useNotifications();

  return (
    <>
      <Button
        onClick={() =>
          showNotification({
            severity: 'success',
            message: 'First notification',
          })
        }
      >
        Show first
      </Button>
      <Button
        onClick={() =>
          showNotification({
            severity: 'info',
            message: 'Second notification',
          })
        }
      >
        Show second
      </Button>
    </>
  );
}

describe('Shared UX feedback', () => {
  it('queues global notifications and shows them one at a time', async () => {
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <NotificationHarness />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Show first' }));
    expect(await screen.findByText('First notification')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show second' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByText('First notification')).not.toBeInTheDocument();
    });

    expect(await screen.findByText('Second notification')).toBeInTheDocument();
  });

  it('keeps confirmation dialogs accessible and wired to both actions', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Delete lead"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep lead"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Delete lead' });
    expect(within(dialog).getByText('This action cannot be undone.')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Keep lead' }));
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders accessible loading and error states', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <>
        <LoadingState />
        <ErrorState
          title="Could not load leads."
          description="Try your request again."
          onRetry={onRetry}
        />
      </>,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load leads.');

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps lead and task form fields labeled', () => {
    render(
      <>
        <LeadFormDialog
          open
          contacts={[{ id: 'contact-1', fullName: 'Ayla Demir' }]}
          ownerOptions={[{ id: 'user-1', fullName: 'Ayla Demir' }]}
          sourceOptions={['Website']}
          stageOptions={[{ id: 'stage-1', name: 'New' }]}
          statusOptions={['New']}
          onClose={() => {}}
          onSubmit={() => {}}
        />
        <TaskFormDialog
          open
          leadOptions={[{ id: 'lead-1', title: 'Hair transplant consultation' }]}
          contactOptions={[{ id: 'contact-1', fullName: 'Ayla Demir' }]}
          assignedUserOptions={[{ id: 'user-1', fullName: 'Ayla Demir' }]}
          priorityOptions={['High', 'Medium']}
          statusOptions={['Pending', 'Completed']}
          onClose={() => {}}
          onSubmit={() => {}}
        />
      </>,
    );

    expect(screen.getAllByLabelText('Title')).toHaveLength(2);
    expect(screen.getAllByLabelText('Contact')).toHaveLength(2);
    expect(screen.getByLabelText('Source')).toBeInTheDocument();
    expect(screen.getByLabelText('Pipeline stage')).toBeInTheDocument();
    expect(screen.getByLabelText('Owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Estimated cost')).toBeInTheDocument();
    expect(screen.getByLabelText('Service requested')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Status')).toHaveLength(2);
    expect(screen.getByLabelText('Lead')).toBeInTheDocument();
    expect(screen.getByLabelText('Assigned user')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
  });
});
