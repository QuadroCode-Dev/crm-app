import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getContacts } from '../../api/contactsApi.js';
import { getLeads } from '../../api/leadsApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import {
  completeTask,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from '../../api/tasksApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ConfirmDialog from '../../shared/components/feedback/ConfirmDialog.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useAuth from '../../shared/hooks/useAuth.js';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import TaskFormDialog from './TaskFormDialog.jsx';
import './tasks.css';

const priorityOptions = ['High', 'Medium', 'Low'];
const statusOptions = ['Pending', 'In Progress', 'Completed'];

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '-';
}

function isOverdue(task) {
  return !task.isCompleted && task.dueDateUtc && dayjs(task.dueDateUtc).isBefore(dayjs(), 'day');
}

function buildTaskPayload(values) {
  return {
    ...values,
    leadId: values.leadId || null,
    contactId: values.contactId || null,
    dueDateUtc: values.dueDateUtc ? dayjs(values.dueDateUtc).endOf('day').toISOString() : null,
  };
}

function TasksPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '10');
  const query = {
    page,
    pageSize,
    assignedUserId: searchParams.get('assignedUserId') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    dueDateFrom: searchParams.get('dueDateFrom') || '',
    dueDateTo: searchParams.get('dueDateTo') || '',
    overdueOnly: searchParams.get('overdueOnly') || '',
    leadId: searchParams.get('leadId') || '',
    contactId: searchParams.get('contactId') || '',
  };

  const tasksQuery = useQuery({
    queryKey: ['tasks', query],
    queryFn: () => getTasks(query),
    placeholderData: (previousData) => previousData,
  });

  const leadsQuery = useQuery({
    queryKey: ['leads', { page: 1, pageSize: 100 }],
    queryFn: () => getLeads({ page: 1, pageSize: 100 }),
  });

  const contactsQuery = useQuery({
    queryKey: ['contacts', { page: 1, pageSize: 100 }],
    queryFn: () => getContacts({ page: 1, pageSize: 100 }),
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (createdTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (createdTask.leadId) {
        queryClient.invalidateQueries({ queryKey: ['lead-timeline', createdTask.leadId] });
      }
      showNotification({
        severity: 'success',
        message: t('Task created successfully.'),
      });
      setFormOpen(false);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }) => updateTask(id, payload),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (updatedTask.leadId) {
        queryClient.invalidateQueries({ queryKey: ['lead-timeline', updatedTask.leadId] });
      }
      showNotification({
        severity: 'success',
        message: t('Task updated successfully.'),
      });
      setFormOpen(false);
      setEditingTask(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (updatedTask.leadId) {
        queryClient.invalidateQueries({ queryKey: ['lead-timeline', updatedTask.leadId] });
      }
      showNotification({
        severity: 'success',
        message: t('Task completed successfully.'),
      });
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showNotification({
        severity: 'success',
        message: t('Task deleted successfully.'),
      });
      setDeletingTask(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const leadMap = useMemo(
    () => Object.fromEntries((leadsQuery.data?.items || []).map((lead) => [lead.id, lead])),
    [leadsQuery.data],
  );
  const contactMap = useMemo(
    () =>
      Object.fromEntries((contactsQuery.data?.items || []).map((contact) => [contact.id, contact])),
    [contactsQuery.data],
  );
  const assignedUserOptions = user
    ? [
        {
          id: user.id,
          fullName: user.fullName,
        },
      ]
    : [];

  const columns = useMemo(
    () => [
      {
        field: 'title',
        headerName: t('Title'),
        flex: 1.2,
        minWidth: 220,
        renderCell: (params) => (
          <Box className="crm-tasks-table__title-cell">
            <span className="crm-tasks-table__title-text">{params.value}</span>
          </Box>
        ),
      },
      {
        field: 'leadId',
        headerName: t('Lead'),
        flex: 1.2,
        minWidth: 240,
        renderCell: (params) =>
          params.value ? (
            <Link className="crm-tasks-table__lead-link" to={`/leads/${params.value}`}>
              {leadMap[params.value]?.title || t('Open lead')}
            </Link>
          ) : (
            <span className="crm-tasks-table__empty-value">-</span>
          ),
      },
      {
        field: 'contactId',
        headerName: t('Contact'),
        flex: 1,
        minWidth: 170,
        valueGetter: (value) => (value ? contactMap[value]?.fullName || '-' : '-'),
      },
      {
        field: 'assignedUserName',
        headerName: t('Assigned user'),
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'priority',
        headerName: t('Priority'),
        flex: 0.75,
        minWidth: 120,
      },
      {
        field: 'status',
        headerName: t('Status'),
        flex: 0.85,
        minWidth: 140,
      },
      {
        field: 'dueDateUtc',
        headerName: t('Due date'),
        flex: 0.9,
        minWidth: 140,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'overdue',
        headerName: t('Overdue'),
        flex: 0.8,
        minWidth: 120,
        sortable: false,
        renderCell: (params) =>
          isOverdue(params.row) ? (
            <Chip color="error" label={t('Overdue')} size="small" />
          ) : (
            <Chip
              color={params.row.isCompleted ? 'success' : 'default'}
              label={params.row.isCompleted ? t('Done') : t('On track')}
              size="small"
              variant={params.row.isCompleted ? 'filled' : 'outlined'}
            />
          ),
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        minWidth: 260,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} className="crm-tasks-table__actions">
            {!params.row.isCompleted ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() => completeTaskMutation.mutate(params.row.id)}
              >
                {t('Complete')}
              </Button>
            ) : null}
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleEdit(params.row)}
            >
              {t('Edit')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => setDeletingTask(params.row)}
            >
              {t('Delete')}
            </Button>
          </Stack>
        ),
      },
    ],
    [completeTaskMutation, contactMap, leadMap, t],
  );

  function updateFilters(nextValues) {
    const updated = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined || value === false) {
        updated.delete(key);
      } else {
        updated.set(key, String(value));
      }
    });

    if (!updated.get('pageSize')) {
      updated.set('pageSize', String(pageSize));
    }

    if (Object.keys(nextValues).some((key) => key !== 'page' && key !== 'pageSize')) {
      updated.set('page', '1');
    }

    setSearchParams(updated);
  }

  function handleCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function handleEdit(task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleSubmit(values) {
    const payload = buildTaskPayload(values);

    if (editingTask) {
      return updateTaskMutation.mutateAsync({
        id: editingTask.id,
        payload,
      });
    }

    return createTaskMutation.mutateAsync(payload);
  }

  if (tasksQuery.isLoading && !tasksQuery.data) {
    return <LoadingState />;
  }

  if (tasksQuery.isError) {
    return (
      <ErrorState
        title={t('Unable to load tasks.')}
        description={normalizeApiError(tasksQuery.error).message}
        onRetry={() => tasksQuery.refetch()}
      />
    );
  }

  const rows = tasksQuery.data?.items || [];

  return (
    <Stack spacing={3} className="crm-tasks-page">
      <PageHeader
        eyebrow={t('Execution')}
        title={t('Tasks')}
        description={t('Track follow-ups, keep owners accountable, and spot overdue work before it slips.')}
        actions={
          <Button onClick={handleCreate} variant="contained">
            {t('Add task')}
          </Button>
        }
      />

      <Card className="crm-card crm-tasks-filters-card">
        <CardContent>
          <Box className="crm-tasks-filters">
            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Assigned user')}
              className="crm-tasks-filters__field"
              value={query.assignedUserId}
              onChange={(event) => updateFilters({ assignedUserId: event.target.value })}
            >
              <option value="">{t('All users')}</option>
              {assignedUserOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName}
                </option>
              ))}
            </TextField>

            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Status')}
              className="crm-tasks-filters__field"
              value={query.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              <option value="">{t('All statuses')}</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {t(option)}
                </option>
              ))}
            </TextField>

            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Priority')}
              className="crm-tasks-filters__field"
              value={query.priority}
              onChange={(event) => updateFilters({ priority: event.target.value })}
            >
              <option value="">{t('All priorities')}</option>
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {t(option)}
                </option>
              ))}
            </TextField>

            <TextField
              type="date"
              InputLabelProps={{ shrink: true }}
              label={t('Due from')}
              className="crm-tasks-filters__field"
              value={query.dueDateFrom}
              onChange={(event) => updateFilters({ dueDateFrom: event.target.value })}
            />

            <TextField
              type="date"
              InputLabelProps={{ shrink: true }}
              label={t('Due to')}
              className="crm-tasks-filters__field"
              value={query.dueDateTo}
              onChange={(event) => updateFilters({ dueDateTo: event.target.value })}
            />

            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Lead')}
              className="crm-tasks-filters__field"
              value={query.leadId}
              onChange={(event) => updateFilters({ leadId: event.target.value })}
            >
              <option value="">{t('All leads')}</option>
              {(leadsQuery.data?.items || []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </TextField>

            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Contact')}
              className="crm-tasks-filters__field"
              value={query.contactId}
              onChange={(event) => updateFilters({ contactId: event.target.value })}
            >
              <option value="">{t('All contacts')}</option>
              {(contactsQuery.data?.items || []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName}
                </option>
              ))}
            </TextField>

            <FormControlLabel
              className="crm-tasks-filters__checkbox"
              control={
                <Checkbox
                  checked={query.overdueOnly === 'true'}
                  onChange={(event) =>
                    updateFilters({ overdueOnly: event.target.checked ? 'true' : '' })
                  }
                />
              }
              label={t('Overdue only')}
            />

            <Box className="crm-tasks-filters__actions">
              <Button
                variant="outlined"
                className="crm-tasks-filters__reset-button"
                onClick={() =>
                  setSearchParams({
                    page: '1',
                    pageSize: String(pageSize),
                  })
                }
              >
                {t('Reset')}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title={t('No tasks match these filters')}
          description={t('Reset the filters or create a new task to start building the work queue.')}
          actionLabel={t('Create task')}
          onAction={handleCreate}
        />
      ) : (
        <Card className="crm-tasks-table-card crm-card">
          <CardContent>
            <Box className="crm-tasks-table">
              <DataGrid
                autoHeight
                columns={columns}
                disableColumnMenu
                disableRowSelectionOnClick
                disableVirtualization
                loading={tasksQuery.isFetching}
                pageSizeOptions={[5, 10, 25]}
                pagination
                paginationMode="server"
                paginationModel={{
                  page: page - 1,
                  pageSize,
                }}
                rowCount={tasksQuery.data?.total || 0}
                rows={rows}
                onPaginationModelChange={(model) =>
                  updateFilters({
                    page: model.page + 1,
                    pageSize: model.pageSize,
                  })
                }
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <TaskFormDialog
        open={formOpen}
        task={editingTask}
        leadOptions={leadsQuery.data?.items || []}
        contactOptions={contactsQuery.data?.items || []}
        assignedUserOptions={assignedUserOptions}
        priorityOptions={priorityOptions}
        statusOptions={statusOptions}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        title={t('Delete task?')}
        description={t("This removes the task from the work queue. You can't undo this action.")}
        confirmLabel={t('Delete task')}
        onCancel={() => setDeletingTask(null)}
        onConfirm={() => deleteTaskMutation.mutate(deletingTask.id)}
      />
    </Stack>
  );
}

export default TasksPage;
