import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { getServiceNames } from '../../api/servicesApi.js';
import LeadFormDialog from './LeadFormDialog.jsx';
import './leads.css';

const statusOptions = ['Open', 'Won', 'Lost', 'Archived'];
const defaultRottingThresholdDays = 7;
const hoursPerDay = 24;

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

function getHoursInStage(lead) {
  if (lead.currentStageEnteredAtUtc) {
    return Math.max(0, dayjs().diff(dayjs(lead.currentStageEnteredAtUtc), 'hour'));
  }

  if (Number.isFinite(Number(lead.daysInCurrentStage))) {
    return Math.max(0, Math.round(Number(lead.daysInCurrentStage) * hoursPerDay));
  }

  return 0;
}

function formatStageAge(totalHours, t) {
  const hours = Math.max(0, Math.floor(totalHours));
  const days = Math.floor(hours / hoursPerDay);
  const remainingHours = hours % hoursPerDay;

  if (days === 0) {
    return `${remainingHours}${t('h')}`;
  }

  return `${days}${t('d')} ${remainingHours}${t('h')}`;
}

function renderStageRottingCell(lead, t) {
  const hoursInStage = getHoursInStage(lead);
  const isRotting = hoursInStage >= defaultRottingThresholdDays * hoursPerDay;
  const label = isRotting
    ? `${formatStageAge(hoursInStage, t)} ${t('rotting')}`
    : `${formatStageAge(hoursInStage, t)} ${t('in stage')}`;

  return (
    <Chip
      className={`crm-leads-stage-age ${isRotting ? 'crm-leads-stage-age--rotting' : ''}`}
      label={label}
      size="small"
    />
  );
}

function renderCompactCell(value) {
  return (
    <Tooltip title={value || ''}>
      <span className="crm-leads-cell-text">{value || '-'}</span>
    </Tooltip>
  );
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

  const leadSourcesQuery = useQuery({
    queryKey: ['lead-sources'],
    queryFn: getLeadSources,
  });

  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
  });

  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: getServiceNames,
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
        headerName: t('Inquiry'),
        flex: 0.65,
        minWidth: 0,
        renderCell: (params) => (
          <Button
            className="crm-leads-title-link"
            component={Link}
            to={`/leads/${params.row.id}`}
            variant="text"
          >
            {params.value}
          </Button>
        ),
      },
      {
        field: 'contactName',
        headerName: t('Contact'),
        flex: 0.95,
        minWidth: 0,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'email',
        headerName: t('Email'),
        flex: 1.05,
        minWidth: 0,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'phone',
        headerName: t('Phone'),
        flex: 0.75,
        minWidth: 0,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'source',
        headerName: t('Source'),
        flex: 0.7,
        minWidth: 0,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'stageName',
        headerName: t('Current stage'),
        flex: 0.72,
        minWidth: 0,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'stageRotting',
        headerName: t('Stage Rotting'),
        flex: 0.72,
        minWidth: 0,
        sortable: false,
        filterable: false,
        renderCell: (params) => renderStageRottingCell(params.row, t),
      },
      {
        field: 'status',
        headerName: t('Status'),
        flex: 0.58,
        minWidth: 0,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'estimatedCost',
        headerName: t('Estimated cost'),
        flex: 0.78,
        minWidth: 0,
        valueFormatter: (value) => formatCurrency(value),
      },
      {
        field: 'serviceRequested',
        headerName: t('Service requested'),
        flex: 0.85,
        minWidth: 0,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'ownerName',
        headerName: t('Owner'),
        flex: 0.82,
        minWidth: 0,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'isDuplicateWarning',
        headerName: t('Duplicate warning'),
        flex: 0.7,
        minWidth: 0,
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
        flex: 0.75,
        minWidth: 0,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        flex: 0.55,
        minWidth: 0,
        sortable: false,
        filterable: false,
        hideable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Stack className="crm-leads-row-actions" direction="row" spacing={0.5}>
            <Tooltip title={t('Edit')}>
              <IconButton
                aria-label={t('Edit')}
                color="primary"
                onClick={() => handleEdit(params.row)}
                size="small"
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('Delete')}>
              <IconButton
                aria-label={t('Delete')}
                color="error"
                onClick={() => setDeletingLead(params.row)}
                size="small"
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
                columnHeaderHeight={44}
                disableColumnReorder={false}
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
                rowHeight={44}
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
        lead={editingLead}
        open={formOpen}
        ownerOptions={ownerOptions}
        serviceOptions={servicesQuery.data || []}
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
