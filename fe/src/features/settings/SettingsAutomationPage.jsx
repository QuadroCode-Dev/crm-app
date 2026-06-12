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
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import AutomationRuleFormDialog from './AutomationRuleFormDialog.jsx';
import './automation.css';
import { useState } from 'react';

function SettingsAutomationPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
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
        message: t('Automation rule created successfully.'),
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
        message: t('Automation rule updated successfully.'),
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
        message: t('Automation rule deleted successfully.'),
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
        title={t('Unable to load automation rules.')}
        description={normalizeApiError(rulesQuery.error).message}
        onRetry={() => rulesQuery.refetch()}
      />
    );
  }

  if (stagesQuery.isError) {
    return (
      <ErrorState
        title={t('Unable to load pipeline stages.')}
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
        eyebrow={t('Settings')}
        title={t('Automation rules')}
        description={t('Create lightweight automations that open follow-up tasks when a lead enters a specific stage.')}
        actions={
          <Button variant="contained" onClick={openCreateDialog}>
            {t('Add automation rule')}
          </Button>
        }
      />

      <Card className="crm-card">
        <CardContent className="crm-automation-page__helper">
          <Stack spacing={1}>
            <Typography variant="subtitle1">{t('This MVP supports one automation pattern')}</Typography>
            <Typography className="crm-muted-text">
              {t('Trigger a task when a lead enters a target stage. Placeholder support is intentionally small and explicit for launch.')}
            </Typography>
            <Box className="crm-automation-page__helper-list">
              <Chip label={t('Trigger: StageChanged')} color="primary" />
              <Chip label={t('Action: CreateTask')} variant="outlined" />
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
          title={t('No automation rules yet')}
          description={t('Create your first stage-change rule to automatically generate follow-up tasks.')}
          actionLabel={t('Create automation rule')}
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
                      {t('Fires when a lead enters')} {stageMap[rule.targetStageId]?.name || t('an unknown stage')}.
                    </Typography>
                  </Box>
                  <Chip
                    label={rule.isActive ? t('Active') : t('Inactive')}
                    color={rule.isActive ? 'success' : 'default'}
                    variant={rule.isActive ? 'filled' : 'outlined'}
                  />
                </Box>

                <Box className="crm-automation-page__meta">
                  <Chip label={t('Trigger: StageChanged')} color="primary" variant="outlined" />
                  <Chip label={t('Action: CreateTask')} variant="outlined" />
                  <Chip label={`${t('Due in')} ${rule.taskDueOffsetDays} ${t('day(s)')}`} variant="outlined" />
                  <Chip
                    label={rule.assignToOwner ? t('Assign to lead owner') : t('Manual assignment')}
                    variant="outlined"
                  />
                </Box>

                <Box className="crm-automation-page__templates">
                  <Box className="crm-automation-page__template">
                    <Typography variant="subtitle2">{t('Task title template')}</Typography>
                    <Typography>{rule.taskTitleTemplate}</Typography>
                  </Box>
                  <Box className="crm-automation-page__template">
                    <Typography variant="subtitle2">{t('Task description template')}</Typography>
                    <Typography>{rule.taskDescriptionTemplate}</Typography>
                  </Box>
                </Box>

                <Box className="crm-automation-page__actions">
                  <Box className="crm-automation-page__meta">
                    <Chip label={`${t('Stage')}: ${stageMap[rule.targetStageId]?.name || '-'}`} />
                  </Box>
                  <Box className="crm-automation-page__actions">
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditingRule(rule);
                        setFormOpen(true);
                      }}
                    >
                      {t('Edit')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setDeletingRule(rule)}
                    >
                      {t('Delete')}
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
        title={t('Delete automation rule?')}
        description={t('This removes the automation and stops future stage-change task creation.')}
        confirmLabel={t('Delete rule')}
        onCancel={() => setDeletingRule(null)}
        onConfirm={() => deleteRuleMutation.mutate(deletingRule.id)}
      />
    </Stack>
  );
}

export default SettingsAutomationPage;
