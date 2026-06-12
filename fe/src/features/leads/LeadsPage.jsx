import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getContacts } from '../../api/contactsApi.js';
import { getLeadSources } from '../../api/leadSourcesApi.js';
import {
  createLead,
  deleteLead,
  getLeads,
  updateLead,
} from '../../api/leadsApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ConfirmDialog from '../../shared/components/feedback/ConfirmDialog.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useAuth from '../../shared/hooks/useAuth.js';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import { getPipelineStages } from '../../api/pipelineApi.js';
import LeadFormDialog from './LeadFormDialog.jsx';
import './leads.css';

const statusOptions = ['New', 'Open', 'Won', 'Lost'];

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '-';
}

function LeadsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '10');
  const query = {
    page,
    pageSize,
    search: searchParams.get('search') || '',
    source: searchParams.get('source') || '',
    stage: searchParams.get('stage') || '',
    status: searchParams.get('status') || '',
    owner: searchParams.get('owner') || '',
  };

  const leadsQuery = useQuery({
    queryKey: ['leads', query],
    queryFn: () => getLeads(query),
    placeholderData: (previousData) => previousData,
  });

  const contactsQuery = useQuery({
    queryKey: ['contacts', { page: 1, pageSize: 100 }],
    queryFn: () => getContacts({ page: 1, pageSize: 100 }),
  });

  const leadSourcesQuery = useQuery({
    queryKey: ['lead-sources'],
    queryFn: getLeadSources,
  });

  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
  });

  const ownerOptions = user
    ? [
        {
          id: user.id,
          fullName: user.fullName,
        },
      ]
    : [];

  const createLeadMutation = useMutation({
    mutationFn: createLead,
    onSuccess: (createdLead) => {
      queryClient.setQueriesData({ queryKey: ['leads'] }, (previousData) => {
        if (!previousData) {
          return previousData;
        }

        return {
          ...previousData,
          items: [createdLead, ...previousData.items].slice(0, previousData.pageSize),
          total: previousData.total + 1,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showNotification({
        severity: 'success',
        message: t('Lead created successfully.'),
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

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }) => updateLead(id, payload),
    onSuccess: (updatedLead, variables) => {
      queryClient.setQueriesData({ queryKey: ['leads'] }, (previousData) => {
        if (!previousData) {
          return previousData;
        }

        return {
          ...previousData,
          items: previousData.items.map((item) =>
            item.id === updatedLead.id ? { ...item, ...updatedLead } : item,
          ),
        };
      });
      queryClient.setQueryData(['lead', updatedLead.id], updatedLead);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.id] });
      showNotification({
        severity: 'success',
        message: t('Lead updated successfully.'),
      });
      setFormOpen(false);
      setEditingLead(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: (_, deletedLeadId) => {
      queryClient.setQueriesData({ queryKey: ['leads'] }, (previousData) => {
        if (!previousData) {
          return previousData;
        }

        return {
          ...previousData,
          items: previousData.items.filter((item) => item.id !== deletedLeadId),
          total: Math.max(0, previousData.total - 1),
        };
      });
      queryClient.removeQueries({ queryKey: ['lead', deletedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showNotification({
        severity: 'success',
        message: t('Lead deleted successfully.'),
      });
      setDeletingLead(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const columns = useMemo(
    () => [
      {
        field: 'title',
        headerName: t('Title'),
        flex: 1.35,
        minWidth: 220,
        renderCell: (params) => (
          <Button component={Link} to={`/leads/${params.row.id}`} variant="text">
            {params.value}
          </Button>
        ),
      },
      { field: 'contactName', headerName: t('Contact'), flex: 1, minWidth: 170 },
      { field: 'email', headerName: t('Email'), flex: 1.1, minWidth: 190 },
      { field: 'phone', headerName: t('Phone'), flex: 1, minWidth: 150 },
      { field: 'source', headerName: t('Source'), flex: 0.9, minWidth: 140 },
      { field: 'stageName', headerName: t('Current stage'), flex: 0.9, minWidth: 140 },
      { field: 'status', headerName: t('Status'), flex: 0.8, minWidth: 120 },
      {
        field: 'estimatedCost',
        headerName: t('Estimated cost'),
        flex: 0.9,
        minWidth: 140,
        valueFormatter: (value) => formatCurrency(value),
      },
      {
        field: 'serviceRequested',
        headerName: t('Service requested'),
        flex: 1.2,
        minWidth: 200,
      },
      { field: 'ownerName', headerName: t('Owner'), flex: 0.9, minWidth: 140 },
      {
        field: 'isDuplicateWarning',
        headerName: t('Duplicate warning'),
        flex: 0.8,
        minWidth: 170,
        sortable: false,
        renderCell: (params) =>
          params.value ? (
            <Chip
              color="warning"
              label={t('Duplicate')}
              size="small"
              className="crm-leads-duplicate-chip"
            />
          ) : (
            <Chip label={t('Clear')} size="small" variant="outlined" />
          ),
      },
      {
        field: 'createdAtUtc',
        headerName: t('Created date'),
        flex: 0.9,
        minWidth: 140,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        minWidth: 180,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button onClick={() => handleEdit(params.row)} size="small" variant="outlined">
              {t('Edit')}
            </Button>
            <Button
              color="error"
              onClick={() => setDeletingLead(params.row)}
              size="small"
              variant="outlined"
            >
              {t('Delete')}
            </Button>
          </Stack>
        ),
      },
    ],
    [t],
  );

  function handleCreate() {
    setEditingLead(null);
    setFormOpen(true);
  }

  function handleEdit(lead) {
    setEditingLead(lead);
    setFormOpen(true);
  }

  function handleSubmit(values) {
    const payload = {
      ...values,
      estimatedCost:
        values.estimatedCost === '' || values.estimatedCost === null
          ? null
          : Number(values.estimatedCost),
    };

    if (editingLead) {
      return updateLeadMutation.mutateAsync({
        id: editingLead.id,
        payload,
      });
    }

    return createLeadMutation.mutateAsync(payload);
  }

  function updateFilters(nextValues) {
    const updated = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        updated.delete(key);
      } else {
        updated.set(key, String(value));
      }
    });

    if (
      nextValues.search !== undefined ||
      nextValues.source !== undefined ||
      nextValues.stage !== undefined ||
      nextValues.status !== undefined ||
      nextValues.owner !== undefined
    ) {
      updated.set('page', '1');
    }

    if (!updated.get('pageSize')) {
      updated.set('pageSize', String(pageSize));
    }

    setSearchParams(updated);
  }

  if (leadsQuery.isLoading && !leadsQuery.data) {
    return <LoadingState />;
  }

  if (leadsQuery.isError) {
    const error = normalizeApiError(leadsQuery.error);
    return (
      <ErrorState
        title={t('Unable to load leads.')}
        description={error.message}
        onRetry={() => leadsQuery.refetch()}
      />
    );
  }

  const rows = leadsQuery.data?.items || [];

  return (
    <Stack spacing={3} className="crm-leads-page">
      <PageHeader
        eyebrow={t('Lead management')}
        title={t('Leads')}
        description={t('Track pipeline-ready leads, filter by source and status, and spot duplicate warnings quickly.')}
        actions={
          <Box className="crm-leads-toolbar">
            <Button onClick={handleCreate} variant="contained">
              {t('Add lead')}
            </Button>
          </Box>
        }
      />

      <Card className="crm-card">
        <CardContent>
          <Box className="crm-leads-filters">
            <TextField
              label={t('Search')}
              value={query.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
              placeholder={t('Title, contact, email, phone')}
              className="crm-leads-filters__search"
            />
            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Source')}
              value={query.source}
              onChange={(event) => updateFilters({ source: event.target.value })}
            >
              <option value="">{t('All sources')}</option>
              {(leadSourcesQuery.data || []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Stage')}
              value={query.stage}
              onChange={(event) => updateFilters({ stage: event.target.value })}
            >
              <option value="">{t('All stages')}</option>
              {(stagesQuery.data || []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Status')}
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
              label={t('Owner')}
              value={query.owner}
              onChange={(event) => updateFilters({ owner: event.target.value })}
            >
              <option value="">{t('All owners')}</option>
              {ownerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName}
                </option>
              ))}
            </TextField>
            <Box className="crm-leads-filters__actions">
              <Button
                variant="outlined"
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
          title={t('No leads match these filters')}
          description={t('Try broadening your search, or reset the filters to see all available leads.')}
        />
      ) : (
        <Card className="crm-leads-table-card">
          <CardContent>
            <Box className="crm-leads-table">
              <DataGrid
                autoHeight
                columns={columns}
                disableColumnMenu
                disableRowSelectionOnClick
                disableVirtualization
                loading={leadsQuery.isFetching}
                pageSizeOptions={[5, 10, 25]}
                pagination
                paginationMode="server"
                paginationModel={{
                  page: page - 1,
                  pageSize,
                }}
                rowCount={leadsQuery.data?.total || 0}
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

      <LeadFormDialog
        contacts={contactsQuery.data?.items || []}
        lead={editingLead}
        open={formOpen}
        ownerOptions={ownerOptions}
        sourceOptions={leadSourcesQuery.data || []}
        stageOptions={stagesQuery.data || []}
        statusOptions={statusOptions}
        onClose={() => {
          setFormOpen(false);
          setEditingLead(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingLead)}
        title={t('Delete lead?')}
        description={t("This removes the lead from the CRM list. You can't undo this action.")}
        confirmLabel={t('Delete lead')}
        onCancel={() => setDeletingLead(null)}
        onConfirm={() => deleteLeadMutation.mutate(deletingLead.id)}
      />
    </Stack>
  );
}

export default LeadsPage;
