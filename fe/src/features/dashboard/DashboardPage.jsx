import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getLeads } from '../../api/leadsApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import {
  getLeadsBySourceReport,
  getPipelineSummaryReport,
  getTasksSummaryReport,
} from '../../api/reportsApi.js';
import { getTasks } from '../../api/tasksApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import './dashboard.css';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US');

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatNumber(value) {
  return numberFormatter.format(value || 0);
}

function formatPreviewDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '-';
}

function DashboardPage() {
  const leadsQuery = useQuery({
    queryKey: ['dashboard', 'leads'],
    queryFn: () => getLeads({ page: 1, pageSize: 100 }),
    retry: false,
  });

  const tasksQuery = useQuery({
    queryKey: ['dashboard', 'tasks'],
    queryFn: () => getTasks({ page: 1, pageSize: 100 }),
    retry: false,
  });

  const leadsBySourceQuery = useQuery({
    queryKey: ['dashboard', 'reports', 'leads-by-source'],
    queryFn: () => getLeadsBySourceReport(),
    retry: false,
  });

  const pipelineSummaryQuery = useQuery({
    queryKey: ['dashboard', 'reports', 'pipeline-summary'],
    queryFn: () => getPipelineSummaryReport(),
    retry: false,
  });

  const tasksSummaryQuery = useQuery({
    queryKey: ['dashboard', 'reports', 'tasks-summary'],
    queryFn: () => getTasksSummaryReport(),
    retry: false,
  });

  const isLoading =
    leadsQuery.isLoading ||
    tasksQuery.isLoading ||
    leadsBySourceQuery.isLoading ||
    pipelineSummaryQuery.isLoading ||
    tasksSummaryQuery.isLoading;

  const firstError =
    leadsQuery.error ||
    tasksQuery.error ||
    leadsBySourceQuery.error ||
    pipelineSummaryQuery.error ||
    tasksSummaryQuery.error;

  const summaryCards = useMemo(() => {
    const leads = leadsQuery.data?.items || [];
    const leadsBySource = leadsBySourceQuery.data || [];
    const pipelineSummary = pipelineSummaryQuery.data || [];
    const tasksSummary = tasksSummaryQuery.data || {};

    const newLeads = leads.filter((lead) => lead.status?.toLowerCase() === 'new').length;
    const openLeads = leadsBySource.reduce((sum, item) => sum + item.openLeads, 0);
    const wonLeads = leadsBySource.reduce((sum, item) => sum + item.wonLeads, 0);
    const lostLeads = leadsBySource.reduce((sum, item) => sum + item.lostLeads, 0);
    const estimatedPipelineValue = pipelineSummary.reduce(
      (sum, stage) => sum + (Number(stage.totalEstimatedValue) || 0),
      0,
    );

    return [
      {
        label: 'New leads',
        value: formatNumber(newLeads),
        helper: 'Fresh opportunities needing first response',
      },
      {
        label: 'Open leads',
        value: formatNumber(openLeads),
        helper: 'Still active across the pipeline',
      },
      {
        label: 'Won leads',
        value: formatNumber(wonLeads),
        helper: 'Closed successfully in the visible dataset',
      },
      {
        label: 'Lost leads',
        value: formatNumber(lostLeads),
        helper: 'Deals that need retrospective review',
      },
      {
        label: 'Overdue tasks',
        value: formatNumber(tasksSummary.overdueTasks || 0),
        helper: 'Follow-ups that have slipped past due date',
      },
      {
        label: 'Estimated pipeline value',
        value: formatCurrency(estimatedPipelineValue),
        helper: 'Summed from the current pipeline stages',
      },
    ];
  }, [
    leadsBySourceQuery.data,
    leadsQuery.data,
    pipelineSummaryQuery.data,
    tasksSummaryQuery.data,
  ]);

  const recentLeadActivity = useMemo(() => {
    return [...(leadsQuery.data?.items || [])]
      .sort((left, right) => dayjs(right.updatedAtUtc).valueOf() - dayjs(left.updatedAtUtc).valueOf())
      .slice(0, 4);
  }, [leadsQuery.data]);

  const upcomingTasks = useMemo(() => {
    return [...(tasksQuery.data?.items || [])]
      .filter((task) => !task.isCompleted && task.status !== 'Completed')
      .sort((left, right) => dayjs(left.dueDateUtc).valueOf() - dayjs(right.dueDateUtc).valueOf())
      .slice(0, 4);
  }, [tasksQuery.data]);

  function handleRetry() {
    leadsQuery.refetch();
    tasksQuery.refetch();
    leadsBySourceQuery.refetch();
    pipelineSummaryQuery.refetch();
    tasksSummaryQuery.refetch();
  }

  if (isLoading) {
    return (
      <div aria-label="Loading dashboard" role="status">
        <LoadingState />
      </div>
    );
  }

  if (firstError) {
    return (
      <ErrorState
        title="Unable to load dashboard."
        description={normalizeApiError(firstError).message}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <Stack spacing={3} className="crm-dashboard-page">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Keep an eye on pipeline momentum, overdue work, and the next best actions for the team."
      />

      <Grid2 container spacing={2}>
        {summaryCards.map((card) => (
          <Grid2 key={card.label} size={{ xs: 12, sm: 6, xl: 4 }}>
            <Card className="crm-card crm-dashboard-summary-card">
              <CardContent>
                <Stack spacing={1}>
                  <Typography className="crm-dashboard-summary-card__label">
                    {card.label}
                  </Typography>
                  <Typography variant="h4">{card.value}</Typography>
                  <Typography variant="body2" className="crm-muted-text">
                    {card.helper}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid2>
        ))}
      </Grid2>

      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, xl: 4 }}>
          <Card className="crm-card crm-dashboard-panel">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Quick actions</Typography>
                <Typography className="crm-muted-text">
                  Jump into the most common CRM workflows without hunting through navigation.
                </Typography>
                <Stack spacing={1.25}>
                  <Button component={RouterLink} to="/leads" variant="contained">
                    Create lead
                  </Button>
                  <Button component={RouterLink} to="/tasks" variant="contained">
                    Create task
                  </Button>
                  <Button component={RouterLink} to="/pipeline" variant="outlined">
                    Go to pipeline
                  </Button>
                  <Button component={RouterLink} to="/reports" variant="outlined">
                    Open reports
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        <Grid2 size={{ xs: 12, xl: 4 }}>
          <Card className="crm-card crm-dashboard-panel">
            <CardContent>
              <Stack spacing={2}>
                <Stack spacing={0.75}>
                  <Typography variant="h6">Recent lead activity</Typography>
                  <Typography className="crm-muted-text">
                    A lightweight preview of the most recently updated opportunities.
                  </Typography>
                </Stack>
                {recentLeadActivity.length === 0 ? (
                  <EmptyState
                    title="No recent lead activity"
                    description="As leads start moving through the pipeline, recent changes will appear here."
                  />
                ) : (
                  <Stack spacing={1.25}>
                    {recentLeadActivity.map((lead) => (
                      <Box key={lead.id} className="crm-dashboard-activity-item">
                        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                          <Typography fontWeight={700}>{lead.title}</Typography>
                          <Typography variant="body2" className="crm-muted-text">
                            {formatPreviewDate(lead.updatedAtUtc)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          <Chip label={lead.stageName} size="small" />
                          <Chip label={lead.source} size="small" variant="outlined" />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        <Grid2 size={{ xs: 12, xl: 4 }}>
          <Card className="crm-card crm-dashboard-panel">
            <CardContent>
              <Stack spacing={2}>
                <Stack spacing={0.75}>
                  <Typography variant="h6">Upcoming tasks</Typography>
                  <Typography className="crm-muted-text">
                    The next pending work items approaching their due date.
                  </Typography>
                </Stack>
                {upcomingTasks.length === 0 ? (
                  <EmptyState
                    title="No upcoming tasks"
                    description="Create a task from the queue or link one to a lead to start tracking follow-up work."
                  />
                ) : (
                  <Stack spacing={1.25}>
                    {upcomingTasks.map((task) => (
                      <Box key={task.id} className="crm-dashboard-task-item">
                        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                          <Typography fontWeight={700}>{task.title}</Typography>
                          <Typography variant="body2" className="crm-muted-text">
                            {formatPreviewDate(task.dueDateUtc)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          <Chip label={task.priority} size="small" color="primary" variant="outlined" />
                          <Chip label={task.assignedUserName || 'Unassigned'} size="small" />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Stack>
  );
}

export default DashboardPage;
