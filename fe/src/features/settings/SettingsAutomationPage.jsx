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
import {
  createAutomationRule,
  deleteAutomationRule,
  getAutomationRules,
  updateAutomationRule,
} from '../../api/automationApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import { getPipelineStages } from '../../api/pipelineApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ConfirmDialog from '../../shared/components/feedback/ConfirmDialog.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useNotifications from '../../shared/hooks/useNotifications.js';
import AutomationRuleFormDialog from './AutomationRuleFormDialog.jsx';
import './automation.css';
import { useState } from 'react';

function SettingsAutomationPage() {
  const queryClient = useQueryClient();
  const { showNotification } = useNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deletingRule, setDeletingRule] = useState(null);

  const rulesQuery = useQuery({
    queryKey: ['automation-rules'],
    queryFn: getAutomationRules,
  });

  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
  });

  const createRuleMutation = useMutation({
    mutationFn: createAutomationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      showNotification({
        severity: 'success',
        message: 'Automation rule created successfully.',
      });
      setFormOpen(false);
      setEditingRule(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, payload }) => updateAutomationRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      showNotification({
        severity: 'success',
        message: 'Automation rule updated successfully.',
      });
      setFormOpen(false);
      setEditingRule(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteAutomationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      showNotification({
        severity: 'success',
        message: 'Automation rule deleted successfully.',
      });
      setDeletingRule(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  function openCreateDialog() {
    setEditingRule(null);
    setFormOpen(true);
  }

  function handleSubmit(values) {
    const payload = {
      ...values,
      triggerType: 'StageChanged',
      actionType: 'CreateTask',
      taskDueOffsetDays: Number(values.taskDueOffsetDays),
    };

    if (editingRule) {
      return updateRuleMutation.mutateAsync({
        id: editingRule.id,
        payload,
      });
    }

    return createRuleMutation.mutateAsync(payload);
  }

  if ((rulesQuery.isLoading || stagesQuery.isLoading) && !rulesQuery.data && !stagesQuery.data) {
    return <LoadingState />;
  }

  if (rulesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load automation rules."
        description={normalizeApiError(rulesQuery.error).message}
        onRetry={() => rulesQuery.refetch()}
      />
    );
  }

  if (stagesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load pipeline stages."
        description={normalizeApiError(stagesQuery.error).message}
        onRetry={() => stagesQuery.refetch()}
      />
    );
  }

  const rules = rulesQuery.data || [];
  const stageMap = Object.fromEntries((stagesQuery.data || []).map((stage) => [stage.id, stage]));

  return (
    <Stack spacing={3} className="crm-automation-page">
      <PageHeader
        eyebrow="Settings"
        title="Automation rules"
        description="Create lightweight automations that open follow-up tasks when a lead enters a specific stage."
        actions={
          <Button variant="contained" onClick={openCreateDialog}>
            Add automation rule
          </Button>
        }
      />

      <Card className="crm-card">
        <CardContent className="crm-automation-page__helper">
          <Stack spacing={1}>
            <Typography variant="subtitle1">This MVP supports one automation pattern</Typography>
            <Typography className="crm-muted-text">
              Trigger a task when a lead enters a target stage. Placeholder support is intentionally
              small and explicit for launch.
            </Typography>
            <Box className="crm-automation-page__helper-list">
              <Chip label="Trigger: StageChanged" color="primary" />
              <Chip label="Action: CreateTask" variant="outlined" />
              <Chip label="{leadTitle}" variant="outlined" />
              <Chip label="{contactName}" variant="outlined" />
              <Chip label="{stageName}" variant="outlined" />
              <Chip label="{serviceRequested}" variant="outlined" />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {rules.length === 0 ? (
        <EmptyState
          title="No automation rules yet"
          description="Create your first stage-change rule to automatically generate follow-up tasks."
          actionLabel="Create automation rule"
          onAction={openCreateDialog}
        />
      ) : (
        <Box className="crm-automation-page__list">
          {rules.map((rule) => (
            <Card key={rule.id} className="crm-card">
              <CardContent className="crm-automation-page__card-content">
                <Box className="crm-automation-page__header">
                  <Box>
                    <Typography variant="h6">{rule.name}</Typography>
                    <Typography className="crm-muted-text">
                      Fires when a lead enters{' '}
                      {stageMap[rule.targetStageId]?.name || 'an unknown stage'}.
                    </Typography>
                  </Box>
                  <Chip
                    label={rule.isActive ? 'Active' : 'Inactive'}
                    color={rule.isActive ? 'success' : 'default'}
                    variant={rule.isActive ? 'filled' : 'outlined'}
                  />
                </Box>

                <Box className="crm-automation-page__meta">
                  <Chip label="Trigger: StageChanged" color="primary" variant="outlined" />
                  <Chip label="Action: CreateTask" variant="outlined" />
                  <Chip label={`Due in ${rule.taskDueOffsetDays} day(s)`} variant="outlined" />
                  <Chip
                    label={rule.assignToOwner ? 'Assign to lead owner' : 'Manual assignment'}
                    variant="outlined"
                  />
                </Box>

                <Box className="crm-automation-page__templates">
                  <Box className="crm-automation-page__template">
                    <Typography variant="subtitle2">Task title template</Typography>
                    <Typography>{rule.taskTitleTemplate}</Typography>
                  </Box>
                  <Box className="crm-automation-page__template">
                    <Typography variant="subtitle2">Task description template</Typography>
                    <Typography>{rule.taskDescriptionTemplate}</Typography>
                  </Box>
                </Box>

                <Box className="crm-automation-page__actions">
                  <Box className="crm-automation-page__meta">
                    <Chip label={`Stage: ${stageMap[rule.targetStageId]?.name || '-'}`} />
                  </Box>
                  <Box className="crm-automation-page__actions">
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditingRule(rule);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setDeletingRule(rule)}
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

      <AutomationRuleFormDialog
        open={formOpen}
        rule={editingRule}
        stageOptions={stagesQuery.data || []}
        onClose={() => {
          setFormOpen(false);
          setEditingRule(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingRule)}
        title="Delete automation rule?"
        description="This removes the automation and stops future stage-change task creation."
        confirmLabel="Delete rule"
        onCancel={() => setDeletingRule(null)}
        onConfirm={() => deleteRuleMutation.mutate(deletingRule.id)}
      />
    </Stack>
  );
}

export default SettingsAutomationPage;
