import {
  Box,
  Button,
  Chip,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CaretDown,
  FunnelSimple,
  MagnifyingGlass,
  Plus,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeadSources } from '../../api/leadSourcesApi.js';
import { createLead, getLeads, updateLeadStage } from '../../api/leadsApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import { getPipelineStages } from '../../api/pipelineApi.js';
import { getServiceNames } from '../../api/servicesApi.js';
import { getTasks } from '../../api/tasksApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useAuth from '../../shared/hooks/useAuth.js';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import LeadFormDialog from '../leads/LeadFormDialog.jsx';
import './pipeline.css';

const statusOptions = ['Open', 'Won', 'Lost', 'Archived'];
const defaultRottingThresholdHours = 168;
const hoursPerDay = 24;
const allFilterValue = 'all';

const phoneCountryOptions = [
  { code: 'LB', label: 'Lebanon', prefix: '+961' },
  { code: 'US', label: 'United States', prefix: '+1' },
  { code: 'GB', label: 'United Kingdom', prefix: '+44' },
  { code: 'TR', label: 'Turkey', prefix: '+90' },
  { code: 'AE', label: 'United Arab Emirates', prefix: '+971' },
  { code: 'SA', label: 'Saudi Arabia', prefix: '+966' },
  { code: 'QA', label: 'Qatar', prefix: '+974' },
  { code: 'KW', label: 'Kuwait', prefix: '+965' },
  { code: 'FR', label: 'France', prefix: '+33' },
  { code: 'DE', label: 'Germany', prefix: '+49' },
];

function sanitizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').replace(/^00/, '+');
}

function getPhoneCountry(phone) {
  const sanitized = sanitizePhone(phone);

  return [...phoneCountryOptions]
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find((option) => sanitized.startsWith(option.prefix));
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

function isLeadRotting(lead, stage) {
  const rottingThresholdHours = stage?.rottingThresholdHours || defaultRottingThresholdHours;

  return getHoursInStage(lead) >= rottingThresholdHours;
}

function isTaskDone(task) {
  return task.isCompleted || task.status === 'Done' || task.status === 'Completed';
}

function isTaskOverdue(task) {
  return !isTaskDone(task) && task.dueDateUtc && dayjs(task.dueDateUtc).isBefore(dayjs());
}

function getLeadTaskStatus(tasks = []) {
  if (!tasks.length) {
    return 'none';
  }

  if (tasks.some(isTaskOverdue)) {
    return 'overdue';
  }

  if (tasks.every(isTaskDone)) {
    return 'done';
  }

  return 'pending';
}

function getLeadTaskStatusLabel(status, t) {
  if (status === 'overdue') {
    return t('Has overdue task');
  }

  if (status === 'done') {
    return t('Tasks done');
  }

  if (status === 'none') {
    return t('No tasks');
  }

  return t('Tasks not due yet');
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

function getDragLeadId(activeId) {
  return String(activeId).replace('lead-card-', '');
}

function getDropStageId(overId, leadStageMap) {
  if (!overId) {
    return null;
  }

  const value = String(overId);

  if (value.startsWith('stage-drop-')) {
    return value.replace('stage-drop-', '');
  }

  if (value.startsWith('lead-card-')) {
    return leadStageMap[getDragLeadId(value)] || null;
  }

  return null;
}

export function applyPipelineDragEnd({ activeId, overId, leadStageMap, onStageChange }) {
  const leadId = getDragLeadId(activeId);
  const currentStageId = leadStageMap[leadId];
  const nextStageId = getDropStageId(overId, leadStageMap);

  if (!leadId || !currentStageId || !nextStageId || currentStageId === nextStageId) {
    return false;
  }

  onStageChange({
    leadId,
    stageId: nextStageId,
  });

  return true;
}

function StageColumn({ stage, leads, activeStageId, showEmptyState = true, children }) {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-drop-${stage.id}`,
  });
  const stageValue = leads.reduce(
    (total, lead) => total + Number(lead.estimatedCost || 0),
    0,
  );
  const averageHoursInStage = leads.length
    ? Math.round(leads.reduce((total, lead) => total + getHoursInStage(lead), 0) / leads.length)
    : 0;

  return (
    <Box
      ref={setNodeRef}
      className={`crm-pipeline-column ${isOver ? 'crm-pipeline-column--hovered' : ''} ${activeStageId && activeStageId === stage.id ? 'crm-pipeline-column--source' : ''
        }`}
    >
      <Box className="crm-pipeline-column__content">
        <Box className="crm-pipeline-column__header">
          <Box className="crm-pipeline-column__title-row">
            <Typography variant="h6">{stage.name}</Typography>
            <Chip
              className="crm-pipeline-column__age-chip"
              label={`${t('Avg')} ${formatStageAge(averageHoursInStage, t)}`}
              size="small"
              variant="outlined"
            />
          </Box>
          <Typography className="crm-pipeline-column__summary">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(stageValue)} · {leads.length} {t('leads')}
          </Typography>
        </Box>
        <Box className="crm-pipeline-column__list">
          {children}
          {showEmptyState && leads.length === 0 ? (
            <EmptyState
              title={t('No leads here yet')}
              description={t('Drag a lead into this stage or create a new lead to start filling the pipeline.')}
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

function PipelineCard({ lead, stage, tasks = [], canChangeStage = true }) {
  const { t } = useLanguage();
  const hoursInStage = getHoursInStage(lead);
  const isRotting = isLeadRotting(lead, stage);
  const taskStatus = getLeadTaskStatus(tasks);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-card-${lead.id}`,
    disabled: !canChangeStage,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      className={`crm-pipeline-card ${isRotting ? 'crm-pipeline-card--rotting' : ''}`}
      {...attributes}
      {...(canChangeStage ? listeners : {})}
    >
      <Box className="crm-pipeline-card__header">
        <Link className="crm-pipeline-card__title" to={`/leads/${lead.id}`}>
          {lead.title}
        </Link>
        <Box className="crm-pipeline-card__signals">
          <Box
            aria-label={getLeadTaskStatusLabel(taskStatus, t)}
            className={`crm-pipeline-card__task-dot crm-pipeline-card__task-dot--${taskStatus}`}
            title={getLeadTaskStatusLabel(taskStatus, t)}
          />
          {lead.isDuplicateWarning ? (
            <WarningCircle className="crm-pipeline-card__warning" size={22} weight="fill" />
          ) : null}
        </Box>
      </Box>
      <Box className="crm-pipeline-card__meta">
        <Typography className="crm-pipeline-card__contact">
          {lead.contactName || lead.companyName || lead.serviceRequested}
        </Typography>
      </Box>
      <Box className="crm-pipeline-card__value-row">
        <UserCircle size={18} weight="fill" />
        <Typography className="crm-pipeline-card__value">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(Number(lead.estimatedCost || 0))}
        </Typography>
        <Chip
          className={`crm-pipeline-card__stage-age ${isRotting ? 'crm-pipeline-card__stage-age--rotting' : ''}`}
          label={
            isRotting
              ? `${formatStageAge(hoursInStage, t)} ${t('rotting')}`
              : `${formatStageAge(hoursInStage, t)} ${t('in stage')}`
          }
          size="small"
        />
      </Box>
    </Box>
  );
}

function PipelineBoardToolbar({
  countryOptions,
  dealCount,
  dealValue,
  filterCount,
  filters,
  search,
  serviceOptions,
  sourceOptions,
  canAddLead,
  onAddLead,
  onFilterChange,
  onResetFilters,
  onSearchChange,
}) {
  const { t } = useLanguage();
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const filterOpen = Boolean(filterAnchorEl);

  function handleFilterChange(name, value) {
    onFilterChange({
      ...filters,
      [name]: value,
    });
  }

  return (
    <Box className="crm-pipeline-toolbar">
      <Box className="crm-pipeline-toolbar__main">
        <Button
          className="crm-pipeline-add-button"
          disabled={!canAddLead}
          startIcon={<Plus size={18} weight="bold" />}
          variant="contained"
          onClick={onAddLead}
        >
          {t('Lead')}
        </Button>
        <TextField
          className="crm-pipeline-toolbar__search"
          label={t('Search')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('Name or service')}
          InputProps={{
            startAdornment: <MagnifyingGlass size={18} weight="duotone" />,
          }}
        />
        <Button
          className="crm-pipeline-toolbar__dropdown"
          endIcon={<CaretDown size={15} weight="bold" />}
          startIcon={<FunnelSimple size={18} weight="duotone" />}
          variant="outlined"
          onClick={(event) => setFilterAnchorEl(event.currentTarget)}
        >
          {filterCount ? `${t('Filter')} (${filterCount})` : t('Filter')}
        </Button>
        <Popover
          anchorEl={filterAnchorEl}
          open={filterOpen}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              className: 'crm-pipeline-filter-popover',
            },
          }}
        >
          <Stack className="crm-pipeline-filter-menu" spacing={1.4}>
            <Typography className="crm-pipeline-filter-menu__title">
              {t('Filter pipeline')}
            </Typography>
            <TextField
              label={t('Stage timing')}
              select
              size="small"
              value={filters.stageTiming}
              onChange={(event) => handleFilterChange('stageTiming', event.target.value)}
            >
              <MenuItem value={allFilterValue}>{t('All leads')}</MenuItem>
              <MenuItem value="rotting">{t('Rotting only')}</MenuItem>
            </TextField>
            <TextField
              label={t('Created date')}
              select
              size="small"
              value={filters.createdDate}
              onChange={(event) => handleFilterChange('createdDate', event.target.value)}
            >
              <MenuItem value={allFilterValue}>{t('Any date')}</MenuItem>
              <MenuItem value="today">{t('Today')}</MenuItem>
            </TextField>
            <TextField
              label={t('Task status')}
              select
              size="small"
              value={filters.taskStatus}
              onChange={(event) => handleFilterChange('taskStatus', event.target.value)}
            >
              <MenuItem value={allFilterValue}>{t('All task statuses')}</MenuItem>
              <MenuItem value="overdue">{t('Overdue')}</MenuItem>
              <MenuItem value="pending">{t('Pending')}</MenuItem>
              <MenuItem value="done">{t('Completed')}</MenuItem>
              <MenuItem value="none">{t('No tasks')}</MenuItem>
            </TextField>
            <TextField
              label={t('Source')}
              select
              size="small"
              value={filters.source}
              onChange={(event) => handleFilterChange('source', event.target.value)}
            >
              <MenuItem value={allFilterValue}>{t('All sources')}</MenuItem>
              {sourceOptions.map((source) => (
                <MenuItem key={source.id || source.name} value={source.id || source.name}>
                  {source.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('Service requested')}
              select
              size="small"
              value={filters.service}
              onChange={(event) => handleFilterChange('service', event.target.value)}
            >
              <MenuItem value={allFilterValue}>{t('All services')}</MenuItem>
              {serviceOptions.map((service) => (
                <MenuItem key={service} value={service}>
                  {service}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('Country')}
              select
              size="small"
              value={filters.country}
              onChange={(event) => handleFilterChange('country', event.target.value)}
            >
              <MenuItem value={allFilterValue}>{t('All countries')}</MenuItem>
              {countryOptions.map((country) => (
                <MenuItem key={country.prefix} value={country.prefix}>
                  {country.label} ({country.prefix})
                </MenuItem>
              ))}
            </TextField>
            <Button
              className="crm-pipeline-filter-menu__reset"
              disabled={!filterCount}
              onClick={onResetFilters}
              variant="outlined"
            >
              {t('Reset filters')}
            </Button>
          </Stack>
        </Popover>
      </Box>

      <Box className="crm-pipeline-toolbar__summary">
        <Typography className="crm-pipeline-toolbar__count">
          {dealCount} {t('leads')}
        </Typography>
        <Typography className="crm-pipeline-toolbar__value">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(dealValue)}
        </Typography>
      </Box>
    </Box>
  );
}

function PipelinePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    stageTiming: allFilterValue,
    createdDate: allFilterValue,
    taskStatus: allFilterValue,
    source: allFilterValue,
    service: allFilterValue,
    country: allFilterValue,
  });
  const userPermissions = new Set(user?.permissions || []);
  const canCreateLead = userPermissions.has('leads.create');
  const canChangeStage = userPermissions.has('leads.change_stage');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
  });
  const leadsQuery = useQuery({
    queryKey: ['pipeline-board-leads'],
    queryFn: () => getLeads({ page: 1, pageSize: 100 }),
  });
  const tasksQuery = useQuery({
    queryKey: ['pipeline-board-tasks'],
    queryFn: () => getTasks({ page: 1, pageSize: 500 }),
  });
  const leadSourcesQuery = useQuery({
    queryKey: ['lead-sources'],
    queryFn: getLeadSources,
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
      queryClient.setQueryData(['pipeline-board-leads'], (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: [createdLead, ...current.items],
          total: (current.total || current.items.length) + 1,
        };
      });
      queryClient.setQueriesData({ queryKey: ['leads'] }, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: [createdLead, ...current.items].slice(0, current.pageSize),
          total: current.total + 1,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['pipeline-board-leads'] });
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

  const stageChangeMutation = useMutation({
    mutationFn: ({ leadId, stageId }) => updateLeadStage(leadId, { stageId }),
    onMutate: async ({ leadId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline-board-leads'] });

      const previousData = queryClient.getQueryData(['pipeline-board-leads']);
      const stages = queryClient.getQueryData(['pipeline-stages']) || [];
      const nextStage = stages.find((item) => item.id === stageId);

      queryClient.setQueryData(['pipeline-board-leads'], (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: current.items.map((lead) =>
            lead.id === leadId
              ? {
                ...lead,
                stageId,
                stageName: nextStage?.name || lead.stageName,
              }
              : lead,
          ),
        };
      });
      setActiveLeadId(null);

      return { previousData };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['pipeline-board-leads'], context.previousData);
      }

      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(['pipeline-board-leads'], (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: current.items.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
        };
      });
      queryClient.setQueriesData({ queryKey: ['leads'] }, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          items: current.items.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', updatedLead.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', updatedLead.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-stage-timer', updatedLead.id] });
      showNotification({
        severity: 'success',
        message: t('Lead stage updated successfully.'),
      });
    },
    onSettled: () => {
      setActiveLeadId(null);
    },
  });

  const sortedStages = useMemo(
    () => [...(stagesQuery.data || [])].sort((a, b) => a.order - b.order),
    [stagesQuery.data],
  );
  const allLeads = leadsQuery.data?.items || [];
  const tasksByLeadId = useMemo(() => {
    return (tasksQuery.data?.items || []).reduce((groups, task) => {
      if (!task.leadId) {
        return groups;
      }

      return {
        ...groups,
        [task.leadId]: [...(groups[task.leadId] || []), task],
      };
    }, {});
  }, [tasksQuery.data]);
  const stageById = useMemo(
    () => Object.fromEntries(sortedStages.map((stage) => [stage.id, stage])),
    [sortedStages],
  );
  const countryOptions = useMemo(() => {
    const countries = allLeads
      .map((lead) => getPhoneCountry(lead.phone))
      .filter(Boolean);
    const uniqueCountries = new Map(countries.map((country) => [country.prefix, country]));

    return [...uniqueCountries.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [allLeads]);
  const normalizedSearch = search.trim().toLowerCase();
  const leads = useMemo(() => {
    return allLeads.filter((lead) => {
      const matchesSearch =
        !normalizedSearch ||
        [
        lead.title,
        lead.contactName,
        lead.serviceRequested,
        lead.email,
        lead.phone,
      ]
        .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) {
        return false;
      }

      if (
        filters.stageTiming === 'rotting' &&
        !isLeadRotting(lead, stageById[lead.stageId])
      ) {
        return false;
      }

      if (
        filters.createdDate === 'today' &&
        !dayjs(lead.createdAtUtc).isSame(dayjs(), 'day')
      ) {
        return false;
      }

      if (
        filters.taskStatus !== allFilterValue &&
        getLeadTaskStatus(tasksByLeadId[lead.id] || []) !== filters.taskStatus
      ) {
        return false;
      }

      if (filters.source !== allFilterValue) {
        const sourceValue = String(lead.sourceId || lead.source || '');

        if (sourceValue !== filters.source) {
          return false;
        }
      }

      if (
        filters.service !== allFilterValue &&
        String(lead.serviceRequested || '') !== filters.service
      ) {
        return false;
      }

      if (filters.country !== allFilterValue) {
        const country = getPhoneCountry(lead.phone);

        if (country?.prefix !== filters.country) {
          return false;
        }
      }

      return true;
    });
  }, [allLeads, filters, normalizedSearch, stageById, tasksByLeadId]);
  const filterCount = Object.values(filters).filter((value) => value !== allFilterValue).length;
  const dealValue = leads.reduce((total, lead) => total + Number(lead.estimatedCost || 0), 0);
  const activeLead = leads.find((lead) => lead.id === activeLeadId) || null;
  const leadStageMap = Object.fromEntries(leads.map((lead) => [lead.id, lead.stageId]));

  function handleCreateLead(values) {
    const payload = {
      ...values,
      estimatedCost:
        values.estimatedCost === '' || values.estimatedCost === null
          ? null
          : Number(values.estimatedCost),
    };

    return createLeadMutation.mutateAsync(payload);
  }

  if ((stagesQuery.isLoading || leadsQuery.isLoading) && !stagesQuery.data && !leadsQuery.data) {
    return <LoadingState />;
  }

  if (stagesQuery.isError) {
    const error = normalizeApiError(stagesQuery.error);
    return (
      <ErrorState
        title={t('Unable to load pipeline stages.')}
        description={error.message}
        onRetry={() => stagesQuery.refetch()}
      />
    );
  }

  if (leadsQuery.isError) {
    const error = normalizeApiError(leadsQuery.error);
    return (
      <ErrorState
        title={t('Unable to load pipeline leads.')}
        description={error.message}
        onRetry={() => leadsQuery.refetch()}
      />
    );
  }

  if (sortedStages.length === 0) {
    return (
      <EmptyState
        title={t('No pipeline stages configured')}
        description={t('Create your first stage in Settings to start organizing leads into a pipeline.')}
      />
    );
  }

  return (
    <Stack spacing={0} className="crm-pipeline-page">
      <PageHeader
        title={t('Leads')}
        description={t('Move leads between stages with drag and drop to reflect how leads are progressing.')}
      />

      <PipelineBoardToolbar
        dealCount={leads.length}
        dealValue={dealValue}
        filterCount={filterCount}
        filters={filters}
        countryOptions={countryOptions}
        search={search}
        serviceOptions={servicesQuery.data || []}
        sourceOptions={leadSourcesQuery.data || []}
        canAddLead={canCreateLead}
        onAddLead={() => setFormOpen(true)}
        onFilterChange={setFilters}
        onResetFilters={() =>
          setFilters({
            stageTiming: allFilterValue,
            createdDate: allFilterValue,
            taskStatus: allFilterValue,
            source: allFilterValue,
            service: allFilterValue,
            country: allFilterValue,
          })
        }
        onSearchChange={setSearch}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          if (!canChangeStage) {
            return;
          }

          setActiveLeadId(getDragLeadId(event.active.id));
        }}
        onDragEnd={(event) => {
          if (!canChangeStage) {
            setActiveLeadId(null);
            return;
          }

          applyPipelineDragEnd({
            activeId: event.active.id,
            overId: event.over?.id,
            leadStageMap,
            onStageChange: ({ leadId, stageId }) =>
              stageChangeMutation.mutate({ leadId, stageId }),
          }) || setActiveLeadId(null);
        }}
        onDragCancel={() => setActiveLeadId(null)}
      >
        <Box className="crm-pipeline-board">
          {sortedStages.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.stageId === stage.id);

            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                leads={stageLeads}
                activeStageId={activeLead ? leadStageMap[activeLead.id] : null}
                showEmptyState={filterCount === 0}
              >
                {stageLeads.map((lead) => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    stage={stage}
                    tasks={tasksByLeadId[lead.id] || []}
                    canChangeStage={canChangeStage}
                  />
                ))}
              </StageColumn>
            );
          })}
        </Box>

        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <Box className="crm-pipeline-overlay">
              <PipelineCard
                lead={activeLead}
                stage={sortedStages.find((stage) => stage.id === activeLead.stageId)}
                tasks={tasksByLeadId[activeLead.id] || []}
                canChangeStage={canChangeStage}
              />
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LeadFormDialog
        lead={null}
        open={formOpen}
        ownerOptions={ownerOptions}
        serviceOptions={servicesQuery.data || []}
        sourceOptions={leadSourcesQuery.data || []}
        stageOptions={sortedStages}
        statusOptions={statusOptions}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateLead}
      />
    </Stack>
  );
}

export default PipelinePage;
