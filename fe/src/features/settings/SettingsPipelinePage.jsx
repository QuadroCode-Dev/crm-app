import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import {
  createPipelineStage,
  deletePipelineStage,
  getPipelineStages,
  reorderPipelineStages,
  updatePipelineStage,
} from '../../api/pipelineApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ConfirmDialog from '../../shared/components/feedback/ConfirmDialog.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useNotifications from '../../shared/hooks/useNotifications.js';
import StageFormDialog from '../pipeline/StageFormDialog.jsx';
import '../pipeline/pipeline.css';

function moveStage(stages, stageId, direction) {
  const index = stages.findIndex((stage) => stage.id === stageId);

  if (index === -1) {
    return stages;
  }

  const nextIndex = direction === 'up' ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= stages.length) {
    return stages;
  }

  const reordered = [...stages];
  const [item] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, item);

  return reordered.map((stage, position) => ({
    ...stage,
    order: position + 1,
  }));
}

function SettingsPipelinePage() {
  const queryClient = useQueryClient();
  const { showNotification } = useNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [deletingStage, setDeletingStage] = useState(null);

  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
  });

  const sortedStages = useMemo(
    () => [...(stagesQuery.data || [])].sort((a, b) => a.order - b.order),
    [stagesQuery.data],
  );

  const createStageMutation = useMutation({
    mutationFn: createPipelineStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      showNotification({
        severity: 'success',
        message: 'Stage created successfully.',
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

  const updateStageMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePipelineStage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      showNotification({
        severity: 'success',
        message: 'Stage updated successfully.',
      });
      setEditingStage(null);
      setFormOpen(false);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: deletePipelineStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      showNotification({
        severity: 'success',
        message: 'Stage deleted successfully.',
      });
      setDeletingStage(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const reorderStagesMutation = useMutation({
    mutationFn: (stageIds) => reorderPipelineStages({ stageIds }),
    onMutate: async (stageIds) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline-stages'] });

      const previousStages = queryClient.getQueryData(['pipeline-stages']);
      queryClient.setQueryData(['pipeline-stages'], (current) =>
        stageIds
          .map((id, index) => {
            const stage = (current || []).find((item) => item.id === id);
            return {
              ...stage,
              order: index + 1,
            };
          })
          .filter(Boolean),
      );

      return { previousStages };
    },
    onError: (error, _variables, context) => {
      if (context?.previousStages) {
        queryClient.setQueryData(['pipeline-stages'], context.previousStages);
      }

      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      showNotification({
        severity: 'success',
        message: 'Stage order updated successfully.',
      });
    },
  });

  function handleSubmit(values) {
    if (editingStage) {
      return updateStageMutation.mutateAsync({
        id: editingStage.id,
        payload: values,
      });
    }

    return createStageMutation.mutateAsync(values);
  }

  function handleMove(stageId, direction) {
    const reordered = moveStage(sortedStages, stageId, direction);
    reorderStagesMutation.mutate(reordered.map((stage) => stage.id));
  }

  if (stagesQuery.isLoading && !stagesQuery.data) {
    return <LoadingState />;
  }

  if (stagesQuery.isError) {
    const error = normalizeApiError(stagesQuery.error);
    return (
      <ErrorState
        title="Unable to load pipeline stages."
        description={error.message}
        onRetry={() => stagesQuery.refetch()}
      />
    );
  }

  return (
    <Stack spacing={3} className="crm-stage-settings-page">
      <PageHeader
        eyebrow="Settings"
        title="Pipeline stages"
        description="Create, rename, disable, and reorder the stages that shape your CRM pipeline."
        actions={
          <Box className="crm-leads-toolbar">
            <Button
              onClick={() => {
                setEditingStage(null);
                setFormOpen(true);
              }}
              variant="contained"
            >
              Add stage
            </Button>
          </Box>
        }
      />

      {sortedStages.length === 0 ? (
        <EmptyState
          title="No stages configured"
          description="Create your first pipeline stage to start organizing leads."
        />
      ) : (
        <Box className="crm-stage-settings-list">
          {sortedStages.map((stage, index) => (
            <Card key={stage.id} className="crm-stage-settings-card">
              <CardContent className="crm-stage-settings-card__content">
                <Box className="crm-stage-settings__header">
                  <Box>
                    <Typography variant="h6">{stage.name}</Typography>
                    <Typography className="crm-muted-text">
                      Order {stage.order} in the pipeline
                    </Typography>
                  </Box>
                  <Chip
                    color={stage.isActive ? 'success' : 'default'}
                    label={stage.isActive ? 'Active' : 'Inactive'}
                    size="small"
                  />
                </Box>

                <Box className="crm-stage-settings__actions">
                  <Box className="crm-stage-settings__order-actions">
                    <Button
                      variant="outlined"
                      onClick={() => handleMove(stage.id, 'up')}
                      disabled={index === 0 || reorderStagesMutation.isPending}
                    >
                      Move up
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleMove(stage.id, 'down')}
                      disabled={
                        index === sortedStages.length - 1 || reorderStagesMutation.isPending
                      }
                    >
                      Move down
                    </Button>
                  </Box>
                  <Box className="crm-stage-settings__order-actions">
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditingStage(stage);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      color="error"
                      variant="outlined"
                      onClick={() => setDeletingStage(stage)}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <StageFormDialog
        open={formOpen}
        stage={editingStage}
        onClose={() => {
          setFormOpen(false);
          setEditingStage(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingStage)}
        title="Delete stage?"
        description="This removes the stage from the current pipeline configuration."
        confirmLabel="Delete stage"
        onCancel={() => setDeletingStage(null)}
        onConfirm={() => deleteStageMutation.mutate(deletingStage.id)}
      />
    </Stack>
  );
}

export default SettingsPipelinePage;
