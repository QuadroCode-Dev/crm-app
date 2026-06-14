import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  Clock3Icon,
  DollarSignIcon,
  FileBarChart2Icon,
  FolderKanbanIcon,
  ListTodoIcon,
  PlusIcon,
  TrendingUpIcon,
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

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatCompactCurrency(value) {
  return compactCurrencyFormatter.format(value || 0);
}

function formatNumber(value) {
  return numberFormatter.format(value || 0);
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

function KpiCard({ card }) {
  const Icon = card.icon;

  return (
    <DashboardCard className="crm-dashboard-card-glow min-h-[12.5rem] justify-between">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="border-border/80 bg-background/70 text-foreground">
              {card.badge}
            </Badge>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </div>
          <span className="rounded-2xl border border-border/70 bg-background/75 p-3 text-primary">
            <Icon className="size-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="crm-dashboard-metric-value">{card.value}</div>
        <CardDescription className="text-sm leading-6">{card.helper}</CardDescription>
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">{card.footer}</span>
        <span className={cn('text-xs font-semibold', getDeltaTone(card.delta))}>
          {card.deltaPrefix}
        </span>
      </CardFooter>
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
          <ChartContainer className="h-[17.5rem] w-full" config={chartConfig}>
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
                      {formatNumber(source.openLeads || 0)} {t('open')} · {formatNumber(source.wonLeads || 0)} {t('won')}
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

function PipelineHealthCard({
  t,
  overdueTasks,
  pendingTasks,
  completedTasks,
  averageStageAge,
  activeStages,
  largestStage,
}) {
  const healthItems = [
    {
      label: t('Overdue tasks'),
      value: formatNumber(overdueTasks),
      helper: overdueTasks > 0 ? t('Needs attention') : t('Under control'),
      icon: Clock3Icon,
      tone: overdueTasks > 0 ? 'text-rose-500' : 'text-emerald-500',
    },
    {
      label: t('Pending tasks'),
      value: formatNumber(pendingTasks),
      helper: t('Queued for follow-up'),
      icon: ListTodoIcon,
      tone: 'text-primary',
    },
    {
      label: t('Avg. days in stage'),
      value: formatNumber(averageStageAge),
      helper: t('Across active stages'),
      icon: TrendingUpIcon,
      tone: 'text-amber-500',
    },
    {
      label: t('Largest stage'),
      value: largestStage?.stageName || '-',
      helper: largestStage ? `${formatNumber(largestStage.leadCount)} ${t('leads')}` : t('No stage data'),
      icon: BriefcaseBusinessIcon,
      tone: 'text-cyan-500',
    },
  ];

  return (
    <DashboardCard className="min-h-[18rem]">
      <CardHeader className="gap-2">
        <Badge variant="outline" className="w-fit border-border/80 bg-background/70 text-foreground">
          {t('Pipeline health')}
        </Badge>
        <CardTitle className="text-xl font-semibold">
          {activeStages > 0 ? t('Live operational check on pipeline risk') : t('Waiting for pipeline activity')}
        </CardTitle>
        <CardDescription>
          {t('Dashboard 2 billing health adapted into CRM workload and stage health signals.')}
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
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">
          {formatNumber(completedTasks)} {t('completed tasks in the current snapshot')}
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

  const dashboardModel = useMemo(() => {
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

    return {
      summaryCards: [
        {
          label: t('New leads'),
          value: formatNumber(newLeads),
          helper: t('Fresh opportunities waiting for first response'),
          badge: t('Lead intake'),
          footer: t('Based on current lead status'),
          deltaPrefix: newLeads > 0 ? t('Active queue') : t('Clear queue'),
          delta: newLeads,
          icon: PlusIcon,
        },
        {
          label: t('Open leads'),
          value: formatNumber(openLeads),
          helper: t('Still active across the pipeline'),
          badge: t('Pipeline'),
          footer: t('Open opportunities across visible sources'),
          deltaPrefix: openLeads > 0 ? t('In motion') : t('No open work'),
          delta: openLeads,
          icon: FolderKanbanIcon,
        },
        {
          label: t('Won leads'),
          value: formatNumber(wonLeads),
          helper: t('Closed successfully in the visible dataset'),
          badge: t('Closed won'),
          footer: t('Momentum from converted opportunities'),
          deltaPrefix: wonLeads > 0 ? t('Healthy close rate') : t('Awaiting wins'),
          delta: wonLeads,
          icon: CheckCircle2Icon,
        },
        {
          label: t('Lost leads'),
          value: formatNumber(lostLeads),
          helper: t('Deals that may need a retrospective review'),
          badge: t('Closed lost'),
          footer: t('Watch for patterns in qualification or follow-up'),
          deltaPrefix: lostLeads > 0 ? t('Review needed') : t('No recent losses'),
          delta: lostLeads === 0 ? 0 : -lostLeads,
          icon: XCircleIcon,
        },
        {
          label: t('Overdue tasks'),
          value: formatNumber(overdueTasks),
          helper: t('Follow-ups that have slipped past due date'),
          badge: t('Task health'),
          footer: t('Immediate workload pressure signal'),
          deltaPrefix: overdueTasks > 0 ? t('Act now') : t('On track'),
          delta: overdueTasks === 0 ? 0 : -overdueTasks,
          icon: Clock3Icon,
        },
        {
          label: t('Estimated pipeline value'),
          value: formatCurrency(estimatedPipelineValue),
          helper: t('Summed from current pipeline stages'),
          badge: t('Revenue view'),
          footer: t('Mapped from the Dashboard 2 revenue area'),
          deltaPrefix: estimatedPipelineValue > 0 ? t('Live estimate') : t('No value yet'),
          delta: estimatedPipelineValue,
          icon: DollarSignIcon,
        },
      ],
      recentLeadActivity: [...leads]
        .sort(
          (left, right) =>
            dayjs(right.updatedAtUtc).valueOf() - dayjs(left.updatedAtUtc).valueOf(),
        )
        .slice(0, 5),
      upcomingTasks: [...tasks]
        .filter((task) => !task.isCompleted && task.status !== 'Completed')
        .sort(
          (left, right) =>
            dayjs(left.dueDateUtc).valueOf() - dayjs(right.dueDateUtc).valueOf(),
        )
        .slice(0, 5),
      leadSources: [...leadsBySource]
        .sort((left, right) => (Number(right.totalLeads) || 0) - (Number(left.totalLeads) || 0))
        .slice(0, 4),
      pipelineValueChartData: pipelineSummary.map((stage) => ({
        stageName: stage.stageName,
        value: Number(stage.totalEstimatedValue) || 0,
        leadCount: Number(stage.leadCount) || 0,
      })),
      overdueTasks,
      pendingTasks,
      completedTasks,
      estimatedPipelineValue,
      averageStageAge,
      activeStages: pipelineSummary.length,
      largestStage,
    };
  }, [leads, leadsBySource, pipelineSummary, t, tasks, tasksSummary]);

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
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_24rem]">
          <section className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboardModel.summaryCards.map((card) => (
                <KpiCard key={card.label} card={card} />
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.95fr)]">
              <PipelineValueCard
                chartData={dashboardModel.pipelineValueChartData}
                estimatedPipelineValue={dashboardModel.estimatedPipelineValue}
                t={t}
              />
              <LeadSourcesCard leadSources={dashboardModel.leadSources} t={t} />
            </div>
          </section>

          <aside className="grid gap-4">
            <QuickActionsCard t={t} />
            <PipelineHealthCard
              t={t}
              overdueTasks={dashboardModel.overdueTasks}
              pendingTasks={dashboardModel.pendingTasks}
              completedTasks={dashboardModel.completedTasks}
              averageStageAge={dashboardModel.averageStageAge}
              activeStages={dashboardModel.activeStages}
              largestStage={dashboardModel.largestStage}
            />
          </aside>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.95fr)]">
          <RecentLeadActivityCard leads={dashboardModel.recentLeadActivity} t={t} />
          <UpcomingTasksCard tasks={dashboardModel.upcomingTasks} t={t} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
