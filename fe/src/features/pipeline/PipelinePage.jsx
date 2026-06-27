import {
  Box,
  Button,
  Chip,
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

function StageColumn({ stage, leads, activeStageId, children }) {
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
            }).format(stageValue)} · {leads.length} {t('deals')}
          </Typography>
        </Box>
        <Box className="crm-pipeline-column__list">
          {children}
          {leads.length === 0 ? (
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

function PipelineCard({ lead, stage }) {
  const { t } = useLanguage();
  const hoursInStage = getHoursInStage(lead);
  const rottingThresholdHours = stage?.rottingThresholdHours || defaultRottingThresholdHours;
  const isRotting = hoursInStage >= rottingThresholdHours;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-card-${lead.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      className="crm-pipeline-card"
      {...attributes}
      {...listeners}
    >
      <Box className="crm-pipeline-card__header">
        <Link className="crm-pipeline-card__title" to={`/leads/${lead.id}`}>
          {lead.title}
        </Link>
        {lead.isDuplicateWarning ? (
          <WarningCircle className="crm-pipeline-card__warning" size={22} weight="fill" />
        ) : null}
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

function PipelineBoardToolbar({ dealCount, dealValue, search, onAddLead, onSearchChange }) {
  const { t } = useLanguage();

  return (
    <Box className="crm-pipeline-toolbar">
      <Box className="crm-pipeline-toolbar__main">
        <Button
          className="crm-pipeline-add-button"
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
        >
          {t('Filter')}
        </Button>
      </Box>

      <Box className="crm-pipeline-toolbar__summary">
        <Typography className="crm-pipeline-toolbar__count">
          {dealCount} {t('deals')}
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
  });
  const leadsQuery = useQuery({
    queryKey: ['pipeline-board-leads'],
    queryFn: () => getLeads({ page: 1, pageSize: 100 }),
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
  const normalizedSearch = search.trim().toLowerCase();
  const leads = useMemo(() => {
    if (!normalizedSearch) {
      return allLeads;
    }

    return allLeads.filter((lead) =>
      [
        lead.title,
        lead.contactName,
        lead.serviceRequested,
        lead.email,
        lead.phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [allLeads, normalizedSearch]);
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
        title={t('Deals')}
        description={t('Move leads between stages with drag and drop to reflect how deals are progressing.')}
      />

      <PipelineBoardToolbar
        dealCount={leads.length}
        dealValue={dealValue}
        search={search}
        onAddLead={() => setFormOpen(true)}
        onSearchChange={setSearch}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          setActiveLeadId(getDragLeadId(event.active.id));
        }}
        onDragEnd={(event) => {
          applyPipelineDragEnd({
            activeId: event.active.id,
            overId: event.over?.id,
            leadStageMap,
            onStageChange: ({ leadId, stageId }) =>
              stageChangeMutation.mutate({ leadId, stageId }),
          });
          setActiveLeadId(null);
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
              >
                {stageLeads.map((lead) => (
                  <PipelineCard key={lead.id} lead={lead} stage={stage} />
                ))}
              </StageColumn>
            );
          })}
        </Box>

        <DragOverlay>
          {activeLead ? (
            <Box className="crm-pipeline-overlay">
              <PipelineCard
                lead={activeLead}
                stage={sortedStages.find((stage) => stage.id === activeLead.stageId)}
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
