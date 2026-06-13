import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  CaretDown,
  CurrencyDollar,
  FunnelSimple,
  GitBranch,
  Info,
  Kanban,
  ListBullets,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  PushPinSimple,
  SortAscending,
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
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeads, updateLeadStage } from '../../api/leadsApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import { getPipelineStages } from '../../api/pipelineApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import './pipeline.css';

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

  return (
    <Box
      ref={setNodeRef}
      className={`crm-pipeline-column ${isOver || activeStageId === stage.id ? 'crm-pipeline-column--active' : ''
        }`}
    >
      <Box className="crm-pipeline-column__content">
        <Box className="crm-pipeline-column__header">
          <Typography variant="h6">{stage.name}</Typography>
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

function PipelineCard({ lead }) {
  const { t } = useLanguage();
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
        <Chip
          className="crm-pipeline-card__activity"
          label=""
          size="small"
          title={t('Next activity')}
        />
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
      </Box>
    </Box>
  );
}

function PipelineBoardToolbar({ dealCount, dealValue }) {
  const { t } = useLanguage();

  return (
    <Box className="crm-pipeline-toolbar">
      <Box className="crm-pipeline-toolbar__primary">
        <ButtonGroup variant="outlined" className="crm-pipeline-view-toggle">
          <Button className="crm-pipeline-view-toggle__button crm-pipeline-view-toggle__button--active">
            <Kanban size={20} weight="duotone" />
          </Button>
          <Button className="crm-pipeline-view-toggle__button">
            <ListBullets size={20} weight="duotone" />
          </Button>
          <Button className="crm-pipeline-view-toggle__button">
            <CurrencyDollar size={20} weight="duotone" />
          </Button>
        </ButtonGroup>
        <Button className="crm-pipeline-add-button" startIcon={<Plus size={18} weight="bold" />} variant="contained">
          {t('Deal')}
        </Button>
      </Box>

      <Box className="crm-pipeline-toolbar__secondary">
        <Typography className="crm-pipeline-toolbar__count">
          {dealCount} {t('deals')}
        </Typography>
        <TooltiplessIcon label={t('Pipeline info')}>
          <Info size={18} weight="duotone" />
        </TooltiplessIcon>
        <Button
          className="crm-pipeline-toolbar__dropdown"
          component={Link}
          endIcon={<CaretDown size={15} weight="bold" />}
          startIcon={<GitBranch size={18} weight="duotone" />}
          to="/settings/pipeline"
          variant="outlined"
        >
          {t('Pipeline')}
        </Button>
        <IconButton
          aria-label={t('Manage stages')}
          className="crm-pipeline-toolbar__icon-button"
          component={Link}
          to="/settings/pipeline"
        >
          <PencilSimple size={18} weight="bold" />
        </IconButton>
        <Button
          className="crm-pipeline-toolbar__dropdown"
          endIcon={<CaretDown size={15} weight="bold" />}
          startIcon={<FunnelSimple size={18} weight="duotone" />}
          variant="outlined"
        >
          {t('Filter')}
        </Button>
      </Box>

      <Box className="crm-pipeline-toolbar__tertiary">
        <Button className="crm-pipeline-pin-button" startIcon={<PushPinSimple size={17} weight="duotone" />}>
          {t('Pin filters')}
        </Button>
        <Typography className="crm-pipeline-toolbar__value">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(dealValue)}
        </Typography>
        <Button className="crm-pipeline-sort-button" startIcon={<SortAscending size={18} weight="bold" />}>
          {t('Sort by: Next activity')} <CaretDown size={14} weight="bold" />
        </Button>
      </Box>
    </Box>
  );
}

function TooltiplessIcon({ children, label }) {
  return (
    <IconButton aria-label={label} className="crm-pipeline-toolbar__plain-icon">
      {children}
    </IconButton>
  );
}

function PipelinePage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [activeLeadId, setActiveLeadId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
  });
  const leadsQuery = useQuery({
    queryKey: ['pipeline-board-leads'],
    queryFn: () => getLeads({ page: 1, pageSize: 100 }),
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
  const leads = leadsQuery.data?.items || [];
  const dealValue = leads.reduce((total, lead) => total + Number(lead.estimatedCost || 0), 0);
  const activeLead = leads.find((lead) => lead.id === activeLeadId) || null;
  const leadStageMap = Object.fromEntries(leads.map((lead) => [lead.id, lead.stageId]));

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
        actions={<Box className="crm-pipeline-search"><MagnifyingGlass size={19} weight="duotone" /><span>{t('Search')}</span></Box>}
      />

      <PipelineBoardToolbar dealCount={leads.length} dealValue={dealValue} />

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
                  <PipelineCard key={lead.id} lead={lead} />
                ))}
              </StageColumn>
            );
          })}
        </Box>

        <DragOverlay>
          {activeLead ? (
            <Box className="crm-pipeline-overlay">
              <PipelineCard lead={activeLead} />
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Stack>
  );
}

export default PipelinePage;
