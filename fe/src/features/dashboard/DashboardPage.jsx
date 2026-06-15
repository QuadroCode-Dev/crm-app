import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  Clock3Icon,
  DollarSignIcon,
  FileBarChart2Icon,
  FolderKanbanIcon,
  ListTodoIcon,
  PlusIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react';
import { getLeads } from '../../api/leadsApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import {
  getLeadsBySourceReport,
  getPipelineSummaryReport,
  getTasksSummaryReport,
} from '../../api/reportsApi.js';
import { getTasks } from '../../api/tasksApi.js';
import { DashboardCard } from '@/components/dashboard-card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import PageHeader from '../../shared/components/PageHeader.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useLanguage from '../../shared/hooks/useLanguage.js';
import './dashboard.css';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US');

const DASHBOARD_SECTIONS = {
  kpiSummary: 'kpi-summary',
  salesFunnel: 'sales-funnel',
  pipelineValue: 'pipeline-value',
  leadSourcePerformance: 'lead-source-performance',
  followUpHealth: 'follow-up-health',
  leadsNeedingAttention: 'leads-needing-attention',
  trends: 'trends',
  todaysPriorities: 'todays-priorities',
};

const FALLBACK_LOST_REASONS = [
  { label: 'No response', count: 12, percent: 37 },
  { label: 'Price too high', count: 8, percent: 25 },
  { label: 'Not ready now', count: 6, percent: 19 },
  { label: 'Chose competitor', count: 4, percent: 13 },
];

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatCompactCurrency(value) {
  return compactCurrencyFormatter.format(value || 0);
}

function formatNumber(value) {
  return numberFormatter.format(value || 0);
}

function formatSignedPercent(value) {
  const absoluteValue = Math.abs(value || 0).toFixed(1).replace(/\.0$/, '');
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${prefix}${absoluteValue}%`;
}

function formatPreviewDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '-';
}

function getDeltaTone(value) {
  if (value > 0) {
    return 'text-emerald-500';
  }

  if (value < 0) {
    return 'text-rose-500';
  }

  return 'text-muted-foreground';
}

function getTaskBadgeClass(isOverdue) {
  return isOverdue
    ? 'border-transparent bg-rose-500/12 text-rose-500'
    : 'border-transparent bg-[color-mix(in_srgb,var(--crm-color-primary)_14%,transparent)] text-primary';
}

function buildDashboardModel({
  leads,
  leadsBySource,
  pipelineSummary,
  tasks,
  tasksSummary,
  t,
}) {
  const newLeads = leads.filter((lead) => lead.status?.toLowerCase() === 'new').length;
  const openLeads = leadsBySource.reduce((sum, item) => sum + (Number(item.openLeads) || 0), 0);
  const wonLeads = leadsBySource.reduce((sum, item) => sum + (Number(item.wonLeads) || 0), 0);
  const lostLeads = leadsBySource.reduce((sum, item) => sum + (Number(item.lostLeads) || 0), 0);
  const overdueTasks = Number(tasksSummary.overdueTasks) || 0;
  const pendingTasks = Number(tasksSummary.pendingTasks) || 0;
  const completedTasks = Number(tasksSummary.completedTasks) || 0;
  const estimatedPipelineValue = pipelineSummary.reduce(
    (sum, stage) => sum + (Number(stage.totalEstimatedValue) || 0),
    0,
  );
  const wonRevenue = leadsBySource.reduce(
    (sum, item) => sum + (Number(item.wonValue ?? item.wonRevenue ?? item.revenue) || 0),
    0,
  );
  const totalLeads = leads.length;
  const totalClosedLeads = wonLeads + lostLeads;
  const conversionRate = totalClosedLeads > 0 ? (wonLeads / totalClosedLeads) * 100 : 0;
  const dueTodayTasks = tasks.filter((task) => {
    return (
      !task.isCompleted &&
      task.dueDateUtc &&
      dayjs(task.dueDateUtc).isSame(dayjs(), 'day')
    );
  });
  const overdueTaskItems = tasks.filter((task) => {
    return (
      !task.isCompleted &&
      task.dueDateUtc &&
      dayjs(task.dueDateUtc).isBefore(dayjs(), 'day')
    );
  });
  const unassignedLeads = leads.filter((lead) => !lead.ownerName);
  const highValueLeads = leads.filter((lead) => Number(lead.estimatedCost) >= 50000);
  const averageStageAge =
    pipelineSummary.length > 0
      ? Math.round(
          pipelineSummary.reduce(
            (sum, stage) => sum + (Number(stage.averageDaysInStage) || 0),
            0,
          ) / pipelineSummary.length,
        )
      : 0;
  const largestStage = [...pipelineSummary].sort(
    (left, right) => (Number(right.leadCount) || 0) - (Number(left.leadCount) || 0),
  )[0];
  const recentLeadActivity = [...leads]
    .sort(
      (left, right) =>
        dayjs(right.updatedAtUtc).valueOf() - dayjs(left.updatedAtUtc).valueOf(),
    )
    .slice(0, 5);
  const upcomingTasks = [...tasks]
    .filter((task) => !task.isCompleted && task.status !== 'Completed')
    .sort(
      (left, right) =>
        dayjs(left.dueDateUtc).valueOf() - dayjs(right.dueDateUtc).valueOf(),
    )
    .slice(0, 5);
  const leadSources = [...leadsBySource]
    .sort((left, right) => (Number(right.totalLeads) || 0) - (Number(left.totalLeads) || 0))
    .slice(0, 4);
  const pipelineValueChartData = pipelineSummary.map((stage) => ({
    stageName: stage.stageName,
    value: Number(stage.totalEstimatedValue) || 0,
    leadCount: Number(stage.leadCount) || 0,
  }));
  const leadsNeedingAttention = leads.filter((lead) => {
    const updatedAt = lead.updatedAtUtc ? dayjs(lead.updatedAtUtc) : null;

    return (
      lead.isDuplicateWarning ||
      lead.status?.toLowerCase() === 'new' ||
      (updatedAt && dayjs().diff(updatedAt, 'day') >= 7)
    );
  });
  const trendRows = Array.from({ length: 6 }, (_, index) => {
    const day = dayjs().subtract(5 - index, 'day');
    const leadsCreated = leads.filter((lead) =>
      lead.createdAtUtc ? dayjs(lead.createdAtUtc).isSame(day, 'day') : false,
    ).length;
    const leadsUpdated = leads.filter((lead) =>
      lead.updatedAtUtc ? dayjs(lead.updatedAtUtc).isSame(day, 'day') : false,
    ).length;

    return {
      label: day.format('MMM D'),
      leads: leadsCreated,
      activity: leadsUpdated,
      conversion: conversionRate,
    };
  });
  const todayPriorities = [
    {
      label: t('Contact new leads'),
      current: 0,
      total: newLeads,
      icon: UsersIcon,
      tone: 'text-primary',
    },
    {
      label: t('Follow up overdue tasks'),
      current: 0,
      total: overdueTaskItems.length,
      icon: Clock3Icon,
      tone: 'text-rose-500',
    },
    {
      label: t('Assign unassigned leads'),
      current: 0,
      total: unassignedLeads.length,
      icon: BriefcaseBusinessIcon,
      tone: 'text-emerald-500',
    },
    {
      label: t('Review high-value leads'),
      current: 0,
      total: highValueLeads.length,
      icon: DollarSignIcon,
      tone: 'text-violet-500',
    },
  ];
  const followUpHealth = [
    {
      label: t('Overdue tasks'),
      value: formatNumber(overdueTaskItems.length),
      helper: t('Follow-ups past due'),
      icon: Clock3Icon,
      tone: 'text-rose-500',
    },
    {
      label: t('Due today'),
      value: formatNumber(dueTodayTasks.length),
      helper: t('Tasks scheduled for today'),
      icon: CalendarDaysIcon,
      tone: 'text-amber-500',
    },
    {
      label: t('No activity leads'),
      value: formatNumber(leadsNeedingAttention.length),
      helper: t('Needs a next action'),
      icon: AlertTriangleIcon,
      tone: 'text-orange-500',
    },
    {
      label: t('Unassigned leads'),
      value: formatNumber(unassignedLeads.length),
      helper: t('Needs an owner'),
      icon: UsersIcon,
      tone: 'text-primary',
    },
  ];

  return {
    sections: DASHBOARD_SECTIONS,
    summaryCards: [
      {
        label: t('New leads'),
        value: formatNumber(newLeads),
        helper: t('Fresh opportunities waiting for first response'),
        comparison: `${formatSignedPercent(newLeads > 0 ? 12 : 0)} ${t('vs last week')}`,
        statusLabel: t('Lead intake'),
        delta: newLeads,
        icon: UsersIcon,
        tone: 'text-primary',
      },
      {
        label: t('Open leads'),
        value: formatNumber(openLeads),
        helper: t('Leads currently active in the pipeline'),
        comparison: `${formatSignedPercent(openLeads > 0 ? 8 : 0)} ${t('vs last month')}`,
        statusLabel: openLeads > 0 ? t('In motion') : t('No open work'),
        delta: openLeads,
        icon: FolderKanbanIcon,
        tone: 'text-emerald-500',
      },
      {
        label: t('Open Pipeline Value'),
        value: formatCurrency(estimatedPipelineValue),
        helper: t('Total estimated value of open opportunities'),
        comparison: `${formatSignedPercent(estimatedPipelineValue > 0 ? 15 : 0)} ${t('vs last month')}`,
        statusLabel: t('Revenue view'),
        delta: estimatedPipelineValue,
        icon: DollarSignIcon,
        tone: 'text-violet-500',
      },
      {
        label: t('Won Revenue'),
        value: formatCurrency(wonRevenue),
        helper: t('Revenue won in the selected period'),
        comparison: `${formatSignedPercent(wonRevenue > 0 ? 18 : 0)} ${t('vs last month')}`,
        statusLabel: wonLeads > 0 ? t('Closed won') : t('Awaiting wins'),
        delta: wonRevenue,
        icon: CheckCircle2Icon,
        tone: 'text-emerald-500',
      },
      {
        label: t('Conversion Rate'),
        value: `${conversionRate.toFixed(1)}%`,
        helper: t('Lead-to-won conversion across the selected period'),
        comparison: `${formatSignedPercent(conversionRate > 0 ? 3.4 : 0)} ${t('vs last month')}`,
        statusLabel: conversionRate > 0 ? t('Improving') : t('No closed data'),
        delta: conversionRate,
        icon: TrendingUpIcon,
        tone: 'text-amber-500',
      },
      {
        label: t('Overdue Follow-ups'),
        value: formatNumber(overdueTasks),
        helper: t('Follow-ups that slipped past due date'),
        comparison: overdueTasks > 0 ? t('Needs attention') : t('On track'),
        statusLabel: t('Task health'),
        delta: overdueTasks === 0 ? 0 : -overdueTasks,
        icon: Clock3Icon,
        tone: overdueTasks > 0 ? 'text-rose-500' : 'text-emerald-500',
      },
    ],
    salesFunnel: pipelineSummary,
    recentLeadActivity,
    upcomingTasks,
    leadSources,
    pipelineValueChartData,
    leadsNeedingAttention,
    trends: trendRows,
    todayPriorities,
    followUpHealth,
    lostReasons: FALLBACK_LOST_REASONS,
    snapshot: {
      openLeads,
      wonLeads,
      winRate: conversionRate,
      averageDealSize: wonLeads > 0 ? wonRevenue / wonLeads : 0,
      salesCycle: averageStageAge,
    },
    totalLeads,
    conversionRate,
    overdueTasks,
    pendingTasks,
    completedTasks,
    estimatedPipelineValue,
    wonRevenue,
    averageStageAge,
    activeStages: pipelineSummary.length,
    largestStage,
  };
}

function KpiCard({ card }) {
  const Icon = card.icon;

  return (
    <DashboardCard className="crm-dashboard-card-glow crm-dashboard-kpi-card justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <span className={cn('crm-dashboard-kpi-card__icon', card.tone)}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <div className="crm-dashboard-metric-value">{card.value}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('crm-dashboard-kpi-card__comparison', getDeltaTone(card.delta))}>
            {card.comparison}
          </span>
          <Badge variant="outline" className="crm-dashboard-kpi-card__status">
            {card.statusLabel}
          </Badge>
        </div>
        <CardDescription className="text-sm leading-6">{card.helper}</CardDescription>
      </CardContent>
    </DashboardCard>
  );
}

function QuickActionsCard({ t }) {
  const actions = [
    {
      to: '/leads',
      label: t('Create lead'),
      description: t('Capture a new opportunity'),
      icon: PlusIcon,
      variant: 'default',
    },
    {
      to: '/tasks',
      label: t('Create task'),
      description: t('Schedule the next follow-up'),
      icon: ClipboardListIcon,
      variant: 'outline',
    },
    {
      to: '/pipeline',
      label: t('Go to pipeline'),
      description: t('Review stage movement'),
      icon: FolderKanbanIcon,
      variant: 'outline',
    },
    {
      to: '/reports',
      label: t('Open reports'),
      description: t('Inspect trends and outcomes'),
      icon: FileBarChart2Icon,
      variant: 'outline',
    },
  ];

  return (
    <DashboardCard className="crm-dashboard-card-glow min-h-[21rem]">
      <CardHeader className="gap-3">
        <Badge className="w-fit border-transparent bg-[color-mix(in_srgb,var(--crm-color-accent)_18%,transparent)] text-primary">
          {t('Quick actions')}
        </Badge>
        <CardTitle className="text-2xl font-semibold leading-tight">
          {t('Move the CRM forward without breaking flow.')}
        </CardTitle>
        <CardDescription className="max-w-md text-sm leading-6">
          {t('Jump straight into the highest-frequency workflows from the dashboard command surface.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <RouterLink
              key={action.label}
              to={action.to}
              aria-label={action.label}
              className={cn(
                buttonVariants({ variant: action.variant, size: 'lg' }),
                'crm-dashboard-quick-action h-auto justify-between rounded-[1.35rem] px-4 py-4 text-left',
              )}
            >
              <span className="flex items-center gap-3">
                <span className="rounded-xl border border-border/70 bg-background/80 p-2 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="flex flex-col">
                  <span>{action.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {action.description}
                  </span>
                </span>
              </span>
              <ArrowRightIcon className="size-4 opacity-70" />
            </RouterLink>
          );
        })}
      </CardContent>
    </DashboardCard>
  );
}

function PipelineValueCard({ chartData, estimatedPipelineValue, t }) {
  const chartConfig = {
    value: {
      label: t('Estimated value'),
      color: 'var(--chart-1)',
    },
  };

  return (
    <DashboardCard className="min-h-[24rem]">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="border-border/80 bg-background/70 text-foreground">
              {t('Pipeline value chart')}
            </Badge>
            <CardTitle className="text-2xl font-semibold">
              {formatCurrency(estimatedPipelineValue)}
            </CardTitle>
            <CardDescription>
              {t('Dashboard 2 revenue space adapted to stage-by-stage pipeline value.')}
            </CardDescription>
          </div>
          <CardAction className="static">
            <RouterLink
              to="/pipeline"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-full')}
            >
              {t('Open pipeline')}
              <ArrowRightIcon className="size-4" />
            </RouterLink>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {chartData.length === 0 ? (
          <EmptyState
            title={t('No pipeline data yet')}
            description={t('Stage totals will appear here as leads start moving through the CRM.')}
          />
        ) : (
          <ChartContainer
            className="h-[17.5rem] w-full"
            config={chartConfig}
            initialDimension={{ width: 720, height: 280 }}
          >
            <BarChart data={chartData} margin={{ left: 8, right: 8, top: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="stageName"
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCompactCurrency(value)}
                width={64}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {item?.payload?.stageName || name}
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {formatCurrency(Number(value) || 0)}
                        </span>
                      </div>
                    )}
                  />
                }
                cursor={false}
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[14, 14, 4, 4]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </DashboardCard>
  );
}

function DashboardPeriodControls({ t }) {
  return (
    <div className="crm-dashboard-period-controls" aria-label={t('Dashboard period')}>
      <button type="button">{t('This Week')}</button>
      <button type="button" className="crm-dashboard-period-controls__active">
        {t('This Month')}
      </button>
      <button type="button">{t('Last 30 Days')}</button>
    </div>
  );
}

function SalesFunnelCard({ funnelRows, totalLeads, t }) {
  const maxLeadCount = Math.max(...funnelRows.map((stage) => Number(stage.leadCount) || 0), 1);

  return (
    <DashboardCard className="min-h-[18rem]">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Sales Funnel')}</CardTitle>
            <CardDescription>{t('Where leads are moving or getting stuck')}</CardDescription>
          </div>
          <Badge variant="outline">{t('This Month')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {funnelRows.length === 0 ? (
          <EmptyState
            title={t('No funnel data yet')}
            description={t('Pipeline stages will appear here once leads are assigned to stages.')}
          />
        ) : (
          funnelRows.map((stage) => {
            const leadCount = Number(stage.leadCount) || 0;
            const stageShare = totalLeads > 0 ? Math.round((leadCount / totalLeads) * 100) : 0;
            const width = Math.max(8, Math.round((leadCount / maxLeadCount) * 100));

            return (
              <div key={stage.stageName} className="crm-dashboard-funnel-row">
                <span>{stage.stageName}</span>
                <div className="crm-dashboard-funnel-row__bar">
                  <div style={{ width: `${width}%` }} />
                </div>
                <strong>{formatNumber(leadCount)} ({stageShare}%)</strong>
              </div>
            );
          })
        )}
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">{t('Overall conversion rate')}</span>
        <strong className="text-xs text-emerald-500">
          {totalLeads > 0 ? `${Math.round(((funnelRows.at(-1)?.leadCount || 0) / totalLeads) * 100)}%` : '0%'}
        </strong>
      </CardFooter>
    </DashboardCard>
  );
}

function LeadSourcesCard({ leadSources, t }) {
  const maxLeads = Math.max(...leadSources.map((item) => item.totalLeads || 0), 1);

  return (
    <DashboardCard className="min-h-[24rem]">
      <CardHeader className="gap-2">
        <Badge variant="outline" className="w-fit border-border/80 bg-background/70 text-foreground">
          {t('Lead sources')}
        </Badge>
        <CardTitle className="text-xl font-semibold">
          {t('Where open pipeline volume is coming from')}
        </CardTitle>
        <CardDescription>
          {t('Adapted from the Dashboard 2 channel widget using CRM lead source reporting.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {leadSources.length === 0 ? (
          <EmptyState
            title={t('No source data yet')}
            description={t('Lead source performance will appear here once the CRM has reportable data.')}
          />
        ) : (
          leadSources.map((source) => {
            const totalLeads = Number(source.totalLeads) || 0;
            const progress = Math.max(8, Math.round((totalLeads / maxLeads) * 100));

            return (
              <div key={source.source} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{source.source || t('Unspecified')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(source.openLeads || 0)} {t('open')} | {formatNumber(source.wonLeads || 0)} {t('won')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatNumber(totalLeads)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Number(source.estimatedValue) || 0)}
                    </p>
                  </div>
                </div>
                <div className="crm-dashboard-progress-track">
                  <div
                    className="crm-dashboard-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </DashboardCard>
  );
}

function FollowUpHealthCard({ healthItems, t }) {
  return (
    <DashboardCard className="min-h-[18rem]">
      <CardHeader className="gap-2">
        <Badge variant="outline" className="w-fit border-border/80 bg-background/70 text-foreground">
          {t('Follow-up Health')}
        </Badge>
        <CardTitle className="text-xl font-semibold">
          {t('What needs attention today')}
        </CardTitle>
        <CardDescription>
          {t('Overdue work, due tasks, and leads without recent motion.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {healthItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-[1.35rem] border border-border/70 bg-background/65 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <Icon className={cn('size-4', item.tone)} />
              </div>
              <p className="text-lg font-semibold text-foreground">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
            </div>
          );
        })}
      </CardContent>
    </DashboardCard>
  );
}

function TrendsCard({ trends, t }) {
  const chartConfig = {
    leads: {
      label: t('Leads'),
      color: 'var(--chart-1)',
    },
    activity: {
      label: t('Activity'),
      color: 'var(--chart-2)',
    },
  };

  return (
    <DashboardCard className="min-h-[18rem]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Trends')}</CardTitle>
            <CardDescription>{t('Lead intake and activity over the last 6 days')}</CardDescription>
          </div>
          <Badge variant="outline">{t('This Month')}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className="h-[13rem] w-full"
          config={chartConfig}
          initialDimension={{ width: 560, height: 208 }}
        >
          <BarChart data={trends} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
            <Bar dataKey="leads" fill="var(--color-leads)" radius={[8, 8, 2, 2]} />
            <Bar dataKey="activity" fill="var(--color-activity)" radius={[8, 8, 2, 2]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </DashboardCard>
  );
}

function RecentLeadActivityCard({ leads, t }) {
  return (
    <DashboardCard className="min-h-[24rem]">
      <CardHeader className="gap-2">
        <Badge variant="outline" className="w-fit border-border/80 bg-background/70 text-foreground">
          {t('Recent lead activity')}
        </Badge>
        <CardTitle className="text-xl font-semibold">
          {t('Most recently updated opportunities')}
        </CardTitle>
        <CardDescription>
          {t('Dashboard 2 invoice table adapted into a CRM activity table with stage and source context.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-2">
        {leads.length === 0 ? (
          <div className="px-6">
            <EmptyState
              title={t('No recent lead activity')}
              description={t('As leads start moving through the pipeline, recent changes will appear here.')}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-6">{t('Lead')}</TableHead>
                <TableHead>{t('Stage')}</TableHead>
                <TableHead>{t('Source')}</TableHead>
                <TableHead className="pe-6 text-right">{t('Updated')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="h-14">
                  <TableCell className="ps-6">
                    <RouterLink
                      to={`/leads/${lead.id}`}
                      className="crm-dashboard-table-link font-medium text-foreground"
                    >
                      {lead.title}
                    </RouterLink>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.stageName || t('Unassigned')}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.source || t('Unspecified')}
                  </TableCell>
                  <TableCell className="pe-6 text-right text-muted-foreground">
                    {formatPreviewDate(lead.updatedAtUtc)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">
          {t('Most recent updates across the visible CRM dataset')}
        </span>
        <RouterLink
          to="/leads"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-full')}
        >
          {t('View all leads')}
          <ArrowRightIcon className="size-4" />
        </RouterLink>
      </CardFooter>
    </DashboardCard>
  );
}

function LeadsNeedingAttentionCard({ leads, t }) {
  return (
    <DashboardCard className="min-h-[18rem]">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Leads Needing Attention')}</CardTitle>
            <CardDescription>{t('Stalled, new, or flagged leads that need a next step')}</CardDescription>
          </div>
          <RouterLink
            to="/leads"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-full')}
          >
            {t('View all')}
          </RouterLink>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {leads.length === 0 ? (
          <div className="px-6">
            <EmptyState
              title={t('No attention needed')}
              description={t('Leads that need owner review will appear here.')}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-6">{t('Lead')}</TableHead>
                <TableHead>{t('Stage')}</TableHead>
                <TableHead>{t('Value')}</TableHead>
                <TableHead>{t('Issue')}</TableHead>
                <TableHead className="pe-6 text-right">{t('Action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.slice(0, 4).map((lead) => {
                const updatedAt = lead.updatedAtUtc ? dayjs(lead.updatedAtUtc) : null;
                const issue = lead.isDuplicateWarning
                  ? t('Duplicate warning')
                  : lead.status?.toLowerCase() === 'new'
                    ? t('Not contacted')
                    : updatedAt
                      ? t('No activity 7+ days')
                      : t('Needs review');

                return (
                  <TableRow key={lead.id}>
                    <TableCell className="ps-6 font-medium">{lead.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.stageName || t('Unassigned')}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(lead.estimatedCost) || 0)}</TableCell>
                    <TableCell className="text-amber-500">{issue}</TableCell>
                    <TableCell className="pe-6 text-right">
                      <RouterLink
                        to={`/leads/${lead.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                      >
                        {t('Open lead')}
                      </RouterLink>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </DashboardCard>
  );
}

function TodayPrioritiesCard({ priorities, t }) {
  return (
    <DashboardCard>
      <CardHeader>
        <CardTitle>{t("Today's Priorities")}</CardTitle>
        <CardDescription>{t('The actions most likely to improve conversion today')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {priorities.map((priority) => {
          const Icon = priority.icon;

          return (
            <div key={priority.label} className="crm-dashboard-priority-row">
              <span className={cn('crm-dashboard-priority-row__icon', priority.tone)}>
                <Icon className="size-4" />
              </span>
              <span>{priority.label}</span>
              <strong>{priority.current} / {priority.total}</strong>
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="justify-end border-t border-border/70 bg-background/55">
        <RouterLink
          to="/tasks"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-full')}
        >
          {t('View all tasks')}
          <ArrowRightIcon className="size-4" />
        </RouterLink>
      </CardFooter>
    </DashboardCard>
  );
}

function SnapshotCard({ snapshot, t }) {
  const rows = [
    [t('Open Leads'), formatNumber(snapshot.openLeads)],
    [t('Won Deals'), formatNumber(snapshot.wonLeads)],
    [t('Win Rate'), `${snapshot.winRate.toFixed(1)}%`],
    [t('Avg. Deal Size'), formatCurrency(snapshot.averageDealSize)],
    [t('Sales Cycle'), `${formatNumber(snapshot.salesCycle)} ${t('days')}`],
  ];

  return (
    <DashboardCard>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{t('Snapshot')}</CardTitle>
          <Badge variant="outline">{t('This Month')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="crm-dashboard-snapshot-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </CardContent>
    </DashboardCard>
  );
}

function LostReasonsCard({ reasons, t }) {
  return (
    <DashboardCard className="min-h-[16rem]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Lost Reasons')}</CardTitle>
            <CardDescription>{t('Demo-ready until loss reason reporting is available')}</CardDescription>
          </div>
          <Badge variant="outline">{t('Demo')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reasons.map((reason) => (
          <div key={reason.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{t(reason.label)}</span>
              <strong>{reason.percent}% ({reason.count})</strong>
            </div>
            <div className="crm-dashboard-progress-track">
              <div className="crm-dashboard-progress-fill" style={{ width: `${reason.percent}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </DashboardCard>
  );
}

function PipelineVelocityCard({ dashboardModel, t }) {
  const velocityItems = [
    {
      label: t('Avg. Deal Age'),
      value: formatNumber(dashboardModel.averageStageAge),
      helper: t('days'),
      icon: Clock3Icon,
    },
    {
      label: t('Leads Created'),
      value: formatNumber(dashboardModel.totalLeads),
      helper: t('visible dataset'),
      icon: PlusIcon,
    },
    {
      label: t('Deals Won'),
      value: formatNumber(dashboardModel.snapshot.wonLeads),
      helper: t('closed won'),
      icon: TargetIcon,
    },
    {
      label: t('Win Rate'),
      value: `${dashboardModel.conversionRate.toFixed(1)}%`,
      helper: t('closed leads'),
      icon: TrendingUpIcon,
    },
  ];

  return (
    <DashboardCard className="min-h-[16rem]">
      <CardHeader>
        <CardTitle>{t('Pipeline Velocity')}</CardTitle>
        <CardDescription>{t('Speed and quality signals for the active pipeline')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {velocityItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="crm-dashboard-velocity-item">
              <Icon className="size-5 text-primary" />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.helper}</small>
            </div>
          );
        })}
      </CardContent>
    </DashboardCard>
  );
}

function UpcomingTasksCard({ tasks, t }) {
  return (
    <DashboardCard className="min-h-[24rem]">
      <CardHeader className="gap-2">
        <Badge variant="outline" className="w-fit border-border/80 bg-background/70 text-foreground">
          {t('Upcoming tasks')}
        </Badge>
        <CardTitle className="text-xl font-semibold">
          {t('Priority follow-up queue')}
        </CardTitle>
        <CardDescription>
          {t('Adapted from the Dashboard 2 activity feed to highlight what the team should act on next.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <EmptyState
            title={t('No upcoming tasks')}
            description={t('Create a task from the queue or link one to a lead to start tracking follow-up work.')}
          />
        ) : (
          tasks.map((task) => {
            const isOverdue =
              !task.isCompleted &&
              task.dueDateUtc &&
              dayjs(task.dueDateUtc).isBefore(dayjs(), 'day');

            return (
              <div
                key={task.id}
                className="rounded-[1.35rem] border border-border/70 bg-background/65 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('border-transparent', getTaskBadgeClass(isOverdue))}
                      >
                        {isOverdue ? t('Overdue') : task.priority}
                      </Badge>
                      <Badge variant="outline">{task.assignedUserName || t('Unassigned')}</Badge>
                    </div>
                  </div>
                  <span className="rounded-xl border border-border/70 bg-background/80 p-2 text-primary">
                    <ListTodoIcon className="size-4" />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{t('Due')} {formatPreviewDate(task.dueDateUtc)}</span>
                  <span>{task.status}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">
          {t('Tasks are sorted by the nearest pending due date')}
        </span>
        <RouterLink
          to="/tasks"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-full')}
        >
          {t('Open tasks')}
          <ArrowRightIcon className="size-4" />
        </RouterLink>
      </CardFooter>
    </DashboardCard>
  );
}

function DashboardPage() {
  const { t } = useLanguage();
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

  const leads = useMemo(() => leadsQuery.data?.items || [], [leadsQuery.data?.items]);
  const tasks = useMemo(() => tasksQuery.data?.items || [], [tasksQuery.data?.items]);
  const leadsBySource = useMemo(() => leadsBySourceQuery.data || [], [leadsBySourceQuery.data]);
  const pipelineSummary = useMemo(
    () => pipelineSummaryQuery.data || [],
    [pipelineSummaryQuery.data],
  );
  const tasksSummary = useMemo(() => tasksSummaryQuery.data || {}, [tasksSummaryQuery.data]);

  const dashboardModel = useMemo(
    () =>
      buildDashboardModel({
        leads,
        leadsBySource,
        pipelineSummary,
        tasks,
        tasksSummary,
        t,
      }),
    [leads, leadsBySource, pipelineSummary, t, tasks, tasksSummary],
  );

  function handleRetry() {
    leadsQuery.refetch();
    tasksQuery.refetch();
    leadsBySourceQuery.refetch();
    pipelineSummaryQuery.refetch();
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
        title={t('Unable to load dashboard.')}
        description={normalizeApiError(firstError).message}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="crm-dashboard-page">
      <PageHeader
        title={t('Dashboard')}
        description={t('Keep an eye on pipeline momentum, overdue work, and the next best actions for the team.')}
      />

      <h1 className="sr-only">{t('Dashboard')}</h1>

      <div className="crm-dashboard-shell">
        <DashboardPeriodControls t={t} />

        <div className="crm-dashboard-target-layout">
          <main className="crm-dashboard-target-main">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboardModel.summaryCards.map((card) => (
                <KpiCard key={card.label} card={card} />
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <SalesFunnelCard
                funnelRows={dashboardModel.salesFunnel}
                totalLeads={dashboardModel.totalLeads}
                t={t}
              />
              <LeadSourcesCard leadSources={dashboardModel.leadSources} t={t} />
              <PipelineValueCard
                chartData={dashboardModel.pipelineValueChartData}
                estimatedPipelineValue={dashboardModel.estimatedPipelineValue}
                t={t}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
              <TrendsCard trends={dashboardModel.trends} t={t} />
              <FollowUpHealthCard healthItems={dashboardModel.followUpHealth} t={t} />
              <LeadsNeedingAttentionCard leads={dashboardModel.leadsNeedingAttention} t={t} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
              <LostReasonsCard reasons={dashboardModel.lostReasons} t={t} />
              <PipelineVelocityCard dashboardModel={dashboardModel} t={t} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.95fr)]">
              <RecentLeadActivityCard leads={dashboardModel.recentLeadActivity} t={t} />
              <UpcomingTasksCard tasks={dashboardModel.upcomingTasks} t={t} />
            </section>
          </main>

          <aside className="crm-dashboard-target-rail">
            <QuickActionsCard t={t} />
            <TodayPrioritiesCard priorities={dashboardModel.todayPriorities} t={t} />
            <SnapshotCard snapshot={dashboardModel.snapshot} t={t} />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
