import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLeads } from '../../api/leadsApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import {
  getLeadsBySourceReport,
  getPipelineSummaryReport,
  getStageAgingReport,
  getTasksSummaryReport,
} from '../../api/reportsApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useAuth from '../../shared/hooks/useAuth.js';
import useLanguage from '../../shared/hooks/useLanguage.js';
import './reports.css';

const reportTabs = [
  { value: 'sources', label: 'Leads by source' },
  { value: 'pipeline', label: 'Pipeline summary' },
  { value: 'aging', label: 'Stage aging' },
  { value: 'tasks', label: 'Tasks summary' },
];

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

function TabPanel({ activeValue, children, value }) {
  if (activeValue !== value) {
    return null;
  }

  return <Box className="crm-reports-tab-panel">{children}</Box>;
}

function TableCard({ children, title, description }) {
  return (
    <Card className="crm-card crm-reports-table-card">
      <CardContent>
        <Stack spacing={0.75} className="crm-reports-table-card__header">
          <Typography variant="h6">{title}</Typography>
          {description ? (
            <Typography className="crm-muted-text">{description}</Typography>
          ) : null}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function MetricBars({ items, labelKey, valueKey, formatter = formatNumber }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <Stack spacing={1.25} className="crm-reports-bars">
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const width = `${Math.max((value / maxValue) * 100, 10)}%`;

        return (
          <Box key={`${item[labelKey]}-${valueKey}`} className="crm-reports-bars__row">
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2">{item[labelKey]}</Typography>
              <Typography variant="body2" fontWeight={700}>
                {formatter(value)}
              </Typography>
            </Stack>
            <Box className="crm-reports-bars__track">
              <Box
                className="crm-reports-bars__fill"
                style={{ width }}
              />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('sources');

  const reportFilters = useMemo(
    () => ({
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      sourceId: searchParams.get('sourceId') || '',
      ownerUserId: searchParams.get('ownerUserId') || '',
    }),
    [searchParams],
  );

  const leadsQuery = useQuery({
    queryKey: ['leads', { page: 1, pageSize: 100 }],
    queryFn: () => getLeads({ page: 1, pageSize: 100 }),
    retry: false,
  });

  const leadsBySourceQuery = useQuery({
    queryKey: ['reports', 'leads-by-source', reportFilters],
    queryFn: () => getLeadsBySourceReport(reportFilters),
    retry: false,
  });

  const pipelineSummaryQuery = useQuery({
    queryKey: ['reports', 'pipeline-summary', reportFilters],
    queryFn: () => getPipelineSummaryReport(reportFilters),
    retry: false,
  });

  const stageAgingQuery = useQuery({
    queryKey: ['reports', 'stage-aging', reportFilters],
    queryFn: () => getStageAgingReport(reportFilters),
    retry: false,
  });

  const tasksSummaryQuery = useQuery({
    queryKey: ['reports', 'tasks-summary', reportFilters],
    queryFn: () => getTasksSummaryReport(reportFilters),
    retry: false,
  });

  const sourceOptions = useMemo(() => {
    const uniqueSources = new Map(
      (leadsQuery.data?.items || [])
        .filter((lead) => lead.sourceId && lead.source)
        .map((lead) => [lead.sourceId, lead.source]),
    );

    return Array.from(uniqueSources, ([id, name]) => ({ id, name }));
  }, [leadsQuery.data]);
  const ownerOptions = user
    ? [
        {
          id: user.id,
          fullName: user.fullName,
        },
      ]
    : [];

  const summaryCards = useMemo(() => {
    const leadsBySource = leadsBySourceQuery.data || [];
    const tasksSummary = tasksSummaryQuery.data;

    const totalLeads = leadsBySource.reduce((sum, item) => sum + item.totalLeads, 0);
    const estimatedValue = leadsBySource.reduce((sum, item) => sum + item.estimatedValue, 0);

    return [
      {
        label: 'Tracked leads',
        value: formatNumber(totalLeads),
        helper: t('Across every visible source'),
      },
      {
        label: 'Estimated pipeline value',
        value: formatCurrency(estimatedValue),
        helper: t('Summed from the source performance report'),
      },
      {
        label: 'Pending tasks',
        value: formatNumber(tasksSummary?.pendingTasks || 0),
        helper: t('Open work across the CRM'),
      },
      {
        label: 'Overdue tasks',
        value: formatNumber(tasksSummary?.overdueTasks || 0),
        helper: t('Immediate follow-up risk'),
      },
    ];
  }, [leadsBySourceQuery.data, t, tasksSummaryQuery.data]);

  const isLoading =
    leadsQuery.isLoading ||
    leadsBySourceQuery.isLoading ||
    pipelineSummaryQuery.isLoading ||
    stageAgingQuery.isLoading ||
    tasksSummaryQuery.isLoading;

  const firstError =
    leadsQuery.error ||
    leadsBySourceQuery.error ||
    pipelineSummaryQuery.error ||
    stageAgingQuery.error ||
    tasksSummaryQuery.error;

  function updateFilters(nextValues) {
    const updated = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (!value) {
        updated.delete(key);
      } else {
        updated.set(key, value);
      }
    });

    setSearchParams(updated);
  }

  function resetFilters() {
    setSearchParams({});
  }

  function handleRetry() {
    leadsQuery.refetch();
    leadsBySourceQuery.refetch();
    pipelineSummaryQuery.refetch();
    stageAgingQuery.refetch();
    tasksSummaryQuery.refetch();
  }

  if (isLoading) {
    return (
      <div aria-label={t('Loading content')} role="status">
        <LoadingState />
      </div>
    );
  }

  if (firstError) {
    return (
      <ErrorState
        title={t('Unable to load reports.')}
        description={normalizeApiError(firstError).message}
        onRetry={handleRetry}
      />
    );
  }

  const leadsBySource = leadsBySourceQuery.data || [];
  const pipelineSummary = pipelineSummaryQuery.data || [];
  const stageAging = stageAgingQuery.data || [];
  const tasksSummary = tasksSummaryQuery.data || null;
  const noData =
    leadsBySource.length === 0 &&
    pipelineSummary.length === 0 &&
    stageAging.length === 0 &&
    !tasksSummary;

  if (noData) {
    return (
      <EmptyState
        title={t('No report data available')}
        description={t('Try widening the date range or remove owner and source filters to see more activity.')}
        actionLabel={t('Reset filters')}
        onAction={resetFilters}
      />
    );
  }

  return (
    <Stack spacing={3} className="crm-reports-page">
      <PageHeader
        eyebrow={t('Insights')}
        title={t('Reports')}
        description={t('Monitor lead sources, pipeline health, stage aging, and task volume from one view.')}
      />

      <Grid2 container spacing={2}>
        {summaryCards.map((card) => (
          <Grid2 key={card.label} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Card className="crm-card crm-reports-summary-card">
              <CardContent>
                <Stack spacing={1}>
                  <Typography className="crm-reports-summary-card__label">
                    {t(card.label)}
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

      <Card className="crm-card crm-reports-filters-card">
        <CardContent>
          <Box className="crm-reports-filters">
            <TextField
              type="date"
              InputLabelProps={{ shrink: true }}
              label={t('Date from')}
              className="crm-reports-filters__field"
              value={reportFilters.dateFrom}
              onChange={(event) => updateFilters({ dateFrom: event.target.value })}
            />
            <TextField
              type="date"
              InputLabelProps={{ shrink: true }}
              label={t('Date to')}
              className="crm-reports-filters__field"
              value={reportFilters.dateTo}
              onChange={(event) => updateFilters({ dateTo: event.target.value })}
            />
            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Source')}
              className="crm-reports-filters__field"
              value={reportFilters.sourceId}
              onChange={(event) => updateFilters({ sourceId: event.target.value })}
            >
              <option value="">{t('All sources')}</option>
              {sourceOptions.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label={t('Owner')}
              className="crm-reports-filters__field"
              value={reportFilters.ownerUserId}
              onChange={(event) => updateFilters({ ownerUserId: event.target.value })}
            >
              <option value="">{t('All owners')}</option>
              {ownerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName}
                </option>
              ))}
            </TextField>
            <Box className="crm-reports-filters__actions">
              <Button variant="outlined" onClick={resetFilters}>
                {t('Reset')}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card className="crm-card crm-reports-tabs-card">
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {reportTabs.map((tab) => (
              <Tab key={tab.value} label={t(tab.label)} value={tab.value} />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <TabPanel activeValue={activeTab} value="sources">
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, xl: 7 }}>
            <TableCard
              title={t('Lead source performance')}
              description={t('Compare total volume, conversion outcomes, and estimated value by source.')}
            >
              <Box className="crm-reports-table">
                <Box className="crm-reports-table__header">
                  <span>{t('Source')}</span>
                  <span>{t('Total')}</span>
                  <span>{t('Open')}</span>
                  <span>{t('Won')}</span>
                  <span>{t('Lost')}</span>
                  <span>{t('Estimated value')}</span>
                </Box>
                {leadsBySource.map((row) => (
                  <Box key={row.source} className="crm-reports-table__row">
                    <span>{row.source}</span>
                    <span>{formatNumber(row.totalLeads)}</span>
                    <span>{formatNumber(row.openLeads)}</span>
                    <span>{formatNumber(row.wonLeads)}</span>
                    <span>{formatNumber(row.lostLeads)}</span>
                    <span>{formatCurrency(row.estimatedValue)}</span>
                  </Box>
                ))}
              </Box>
            </TableCard>
          </Grid2>
          <Grid2 size={{ xs: 12, xl: 5 }}>
            <TableCard
              title={t('Estimated value by source')}
              description={t('A quick visual read on where the biggest opportunities originate.')}
            >
              <MetricBars
                items={leadsBySource}
                labelKey="source"
                valueKey="estimatedValue"
                formatter={formatCurrency}
              />
            </TableCard>
          </Grid2>
        </Grid2>
      </TabPanel>

      <TabPanel activeValue={activeTab} value="pipeline">
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, xl: 7 }}>
            <TableCard
              title={t('Pipeline summary')}
              description={t('See current stage distribution, value concentration, and average time spent.')}
            >
              <Box className="crm-reports-table">
                <Box className="crm-reports-table__header">
                  <span>{t('Stage')}</span>
                  <span>{t('Lead count')}</span>
                  <span>{t('Total estimated value')}</span>
                  <span>{t('Avg. days in stage')}</span>
                </Box>
                {pipelineSummary.map((row) => (
                  <Box key={row.stageName} className="crm-reports-table__row">
                    <span>{row.stageName}</span>
                    <span>{formatNumber(row.leadCount)}</span>
                    <span>{formatCurrency(row.totalEstimatedValue)}</span>
                    <span>{formatNumber(row.averageDaysInStage)} {t('days')}</span>
                  </Box>
                ))}
              </Box>
            </TableCard>
          </Grid2>
          <Grid2 size={{ xs: 12, xl: 5 }}>
            <TableCard
              title={t('Leads per pipeline stage')}
              description={t('A visual balance check across active stages.')}
            >
              <MetricBars
                items={pipelineSummary}
                labelKey="stageName"
                valueKey="leadCount"
              />
            </TableCard>
          </Grid2>
        </Grid2>
      </TabPanel>

      <TabPanel activeValue={activeTab} value="aging">
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, xl: 7 }}>
            <TableCard
              title={t('Stage aging')}
              description={t('Highlight where deals are slowing down so coaching and follow-up can happen sooner.')}
            >
              <Box className="crm-reports-table">
                <Box className="crm-reports-table__header">
                  <span>{t('Stage')}</span>
                  <span>{t('Average duration')}</span>
                  <span>{t('Max duration')}</span>
                  <span>{t('Current leads')}</span>
                </Box>
                {stageAging.map((row) => (
                  <Box key={row.stageName} className="crm-reports-table__row">
                    <span>{row.stageName}</span>
                    <span>{formatNumber(row.averageDurationDays)} {t('days')}</span>
                    <span>{formatNumber(row.maxDurationDays)} {t('days')}</span>
                    <span>{formatNumber(row.currentLeadsInStage)}</span>
                  </Box>
                ))}
              </Box>
            </TableCard>
          </Grid2>
          <Grid2 size={{ xs: 12, xl: 5 }}>
            <TableCard
              title={t('Average duration by stage')}
              description={t('Use this to spot bottlenecks before they become lost deals.')}
            >
              <MetricBars
                items={stageAging}
                labelKey="stageName"
                valueKey="averageDurationDays"
                formatter={(value) => `${formatNumber(value)} ${t('days')}`}
              />
            </TableCard>
          </Grid2>
        </Grid2>
      </TabPanel>

      <TabPanel activeValue={activeTab} value="tasks">
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, xl: 4 }}>
            <Card className="crm-card crm-reports-task-summary-card">
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6">{t('Task totals')}</Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip label={`${t('Total')}: ${formatNumber(tasksSummary.totalTasks)}`} />
                    <Chip label={`${t('Pending')}: ${formatNumber(tasksSummary.pendingTasks)}`} />
                    <Chip label={`${t('Completed')}: ${formatNumber(tasksSummary.completedTasks)}`} />
                    <Chip color="error" label={`${t('Overdue')}: ${formatNumber(tasksSummary.overdueTasks)}`} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid2>
          <Grid2 size={{ xs: 12, xl: 8 }}>
            <TableCard
              title={t('Tasks by priority')}
              description={t('Review workload mix so the team does not over-index on low-impact work.')}
            >
              <Box className="crm-reports-table">
                <Box className="crm-reports-table__header crm-reports-table__header--compact">
                  <span>{t('Priority')}</span>
                  <span>{t('Count')}</span>
                </Box>
                {tasksSummary.tasksByPriority.map((row) => (
                  <Box key={row.priority} className="crm-reports-table__row crm-reports-table__row--compact">
                    <span>{row.priority}</span>
                    <span>{formatNumber(row.count)}</span>
                  </Box>
                ))}
              </Box>
            </TableCard>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <TableCard
              title={t('Priority distribution')}
              description={t('A quick visual check on how work is stacked by urgency.')}
            >
              <MetricBars
                items={tasksSummary.tasksByPriority}
                labelKey="priority"
                valueKey="count"
              />
            </TableCard>
          </Grid2>
        </Grid2>
      </TabPanel>
    </Stack>
  );
}

export default ReportsPage;
