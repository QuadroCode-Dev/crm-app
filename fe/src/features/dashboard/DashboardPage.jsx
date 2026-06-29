import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangleIcon,
  ArrowDownIcon,
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
import {
  buildDashboardModel as buildDashboardDataModel,
  DATE_RANGE_OPTIONS as DASHBOARD_DATE_RANGE_OPTIONS,
  getDateRangeLabel as getDashboardDateRangeLabel,
} from './dashboardData.js';
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

const LEAD_SOURCE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--crm-color-primary)',
];

export const LEGACY_DASHBOARD_SECTIONS = {
  kpiSummary: 'kpi-summary',
  salesFunnel: 'sales-funnel',
  pipelineValue: 'pipeline-value',
  leadSourcePerformance: 'lead-source-performance',
  followUpHealth: 'follow-up-health',
  leadsNeedingAttention: 'leads-needing-attention',
  trends: 'trends',
  todaysPriorities: 'todays-priorities',
};

export const LEGACY_SALES_FUNNEL_STAGE_ORDER = [
  'New Lead',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Won',
];

export const LEGACY_DATE_RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'This Week' },
  { id: 'this-month', label: 'This Month' },
  { id: 'last-30-days', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
];

export function legacyFormatSignedPercent(value) {
  const absoluteValue = Math.abs(value || 0).toFixed(1).replace(/\.0$/, '');
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${prefix}${absoluteValue}%`;
}

export function legacyFormatDurationFromMinutes(value) {
  const totalMinutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

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

const DASHBOARD_ICON_MAP = {
  alert: AlertTriangleIcon,
  briefcase: BriefcaseBusinessIcon,
  calendar: CalendarDaysIcon,
  check: CheckCircle2Icon,
  clock: Clock3Icon,
  dollar: DollarSignIcon,
  fallback: TargetIcon,
  pipeline: FolderKanbanIcon,
  target: TargetIcon,
  trend: TrendingUpIcon,
  users: UsersIcon,
};

export function buildLegacySalesFunnelRows(pipelineSummary) {
  if (pipelineSummary.length === 0) {
    return [];
  }

  const stageMap = new Map(
    pipelineSummary.map((stage) => [
      (stage.stageName ?? stage.stage)?.toLowerCase(),
      {
        stageName: stage.stageName ?? stage.stage,
        leadCount: Number(stage.leadCount ?? stage.count) || 0,
      },
    ]),
  );
  const orderedStageNames = [
    ...LEGACY_SALES_FUNNEL_STAGE_ORDER,
    ...pipelineSummary
      .map((stage) => stage.stageName ?? stage.stage)
      .filter((stageName) => {
        return (
          stageName &&
          !LEGACY_SALES_FUNNEL_STAGE_ORDER.some(
            (orderedStageName) => orderedStageName.toLowerCase() === stageName.toLowerCase(),
          )
        );
      }),
  ];

  const rows = orderedStageNames.map((stageName) => {
    const stage = stageMap.get(stageName.toLowerCase());

    return {
      stageName,
      leadCount: stage?.leadCount || 0,
    };
  });

  return rows.map((stage, index) => {
    const nextStage = rows[index + 1];
    const conversionToNext =
      nextStage && stage.leadCount > 0 ? (nextStage.leadCount / stage.leadCount) * 100 : null;

    return {
      ...stage,
      nextStageName: nextStage?.stageName || null,
      conversionToNext,
      dropOffCount: nextStage ? Math.max(stage.leadCount - nextStage.leadCount, 0) : 0,
    };
  });
}

export function buildLegacyLeadSourceRows(leadsBySource) {
  return [...leadsBySource]
    .map((source) => {
      const totalLeads = Number(source.totalLeads ?? source.leads) || 0;
      const wonLeads = Number(source.wonLeads ?? source.won) || 0;
      const revenue =
        Number(source.wonValue ?? source.wonRevenue ?? source.revenue ?? source.estimatedValue) || 0;
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      return {
        source: source.source || source.sourceName || 'Unspecified',
        totalLeads,
        wonLeads,
        conversionRate,
        revenue,
      };
    })
    .sort((left, right) => {
      if (right.revenue !== left.revenue) {
        return right.revenue - left.revenue;
      }

      if (right.conversionRate !== left.conversionRate) {
        return right.conversionRate - left.conversionRate;
      }

      return right.totalLeads - left.totalLeads;
    })
    .slice(0, 6);
}

export function buildLegacyAverageFirstResponseTime(leads) {
  const responseTimes = leads
    .map((lead) => {
      const explicitMinutes = Number(
        lead.firstResponseMinutes ??
          lead.firstResponseTimeMinutes ??
          lead.firstResponseTimeInMinutes,
      );

      if (Number.isFinite(explicitMinutes) && explicitMinutes >= 0) {
        return explicitMinutes;
      }

      if (!lead.createdAtUtc || !lead.updatedAtUtc || lead.status?.toLowerCase() === 'new') {
        return null;
      }

      const createdAt = dayjs(lead.createdAtUtc);
      const updatedAt = dayjs(lead.updatedAtUtc);

      if (!createdAt.isValid() || !updatedAt.isValid() || updatedAt.isBefore(createdAt)) {
        return null;
      }

      return updatedAt.diff(createdAt, 'minute');
    })
    .filter((value) => value !== null);

  if (responseTimes.length === 0) {
    return {
      minutes: 0,
      label: '0m',
    };
  }

  const averageMinutes =
    responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length;

  return {
    minutes: averageMinutes,
    label: legacyFormatDurationFromMinutes(averageMinutes),
  };
}

export function getLegacyLeadStageAgeDays(lead) {
  const explicitAge = Number(
    lead.daysInCurrentStage ??
      lead.stageAgeDays ??
      lead.currentStageAgeDays ??
      lead.daysSinceStageChange,
  );

  if (Number.isFinite(explicitAge) && explicitAge >= 0) {
    return explicitAge;
  }

  const stageEnteredAt = lead.stageEnteredAtUtc ?? lead.currentStageEnteredAtUtc;

  if (stageEnteredAt && dayjs(stageEnteredAt).isValid()) {
    return dayjs().diff(dayjs(stageEnteredAt), 'day');
  }

  if (lead.createdAtUtc && dayjs(lead.createdAtUtc).isValid()) {
    return dayjs().diff(dayjs(lead.createdAtUtc), 'day');
  }

  return 0;
}

export function buildLegacyLeadsNeedingAttentionRows({ leads, overdueTaskItems, t }) {
  const overdueTaskLeadIds = new Set(
    overdueTaskItems.map((task) => task.leadId).filter(Boolean),
  );

  return leads
    .map((lead) => {
      const status = lead.status?.toLowerCase();
      const updatedAt = lead.updatedAtUtc ? dayjs(lead.updatedAtUtc) : null;
      const daysInactive = updatedAt?.isValid() ? dayjs().diff(updatedAt, 'day') : 0;
      const stageAgeDays = getLegacyLeadStageAgeDays(lead);
      const estimatedValue = Number(lead.estimatedCost ?? lead.value) || 0;
      const isClosed = status === 'won' || status === 'lost';
      const issueCandidates = [
        {
          active: !isClosed && overdueTaskLeadIds.has(lead.id),
          issue: t('Follow-up overdue'),
          type: 'overdue',
          priority: 100,
          actionLabel: t('Create task'),
          actionTo: '/tasks',
          tone: 'text-rose-500',
        },
        {
          active: !isClosed && !lead.ownerName,
          issue: t('Unassigned'),
          type: 'unassigned',
          priority: 90,
          actionLabel: t('Assign'),
          actionTo: `/leads/${lead.id}`,
          tone: 'text-primary',
        },
        {
          active: !isClosed && status === 'new',
          issue: t('Not contacted'),
          type: 'not-contacted',
          priority: 80,
          actionLabel: t('Open lead'),
          actionTo: `/leads/${lead.id}`,
          tone: 'text-amber-500',
        },
        {
          active: !isClosed && estimatedValue >= 50000 && daysInactive >= 7,
          issue: t('High-value inactive'),
          type: 'high-value-inactive',
          priority: 70,
          actionLabel: t('Open lead'),
          actionTo: `/leads/${lead.id}`,
          tone: 'text-orange-500',
        },
        {
          active: !isClosed && stageAgeDays >= 10,
          issue: `${t('Stuck in stage')} ${stageAgeDays} ${t('days')}`,
          type: 'stuck',
          priority: 60,
          actionLabel: t('Open lead'),
          actionTo: `/leads/${lead.id}`,
          tone: 'text-violet-500',
        },
      ];
      const topIssue = issueCandidates.find((item) => item.active);

      if (!topIssue) {
        return null;
      }

      return {
        id: lead.id,
        lead: lead.title || lead.contactName || t('Untitled lead'),
        stage: lead.stageName || t('Unassigned'),
        value: estimatedValue,
        owner: lead.ownerName || t('Unassigned'),
        issue: topIssue.issue,
        issueType: topIssue.type,
        priority: topIssue.priority,
        actionLabel: topIssue.actionLabel,
        actionTo: topIssue.actionTo,
        tone: topIssue.tone,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return right.value - left.value;
    })
    .slice(0, 6);
}

export function getLegacyDateRangeLabel(dateRange, t) {
  const option = LEGACY_DATE_RANGE_OPTIONS.find((item) => item.id === dateRange);

  return t(option?.label || 'This Month');
}

export function getLegacyTrendBuckets(dateRange) {
  const now = dayjs();

  if (dateRange === 'today') {
    const startOfToday = now.startOf('day');

    return Array.from({ length: 6 }, (_, index) => {
      const start = startOfToday.add(index * 4, 'hour');
      const end = index === 5 ? startOfToday.add(1, 'day') : start.add(4, 'hour');

      return {
        start,
        end,
        label: start.format('ha'),
      };
    });
  }

  const dayCountByRange = {
    'this-week': 7,
    'this-month': Math.max(now.date(), 1),
    'last-30-days': 30,
    custom: 14,
  };
  const dayCount = dayCountByRange[dateRange] || dayCountByRange['this-month'];

  return Array.from({ length: dayCount }, (_, index) => {
    const start = now.subtract(dayCount - 1 - index, 'day').startOf('day');

    return {
      start,
      end: start.add(1, 'day'),
      label: start.format(dayCount > 10 ? 'MMM D' : 'ddd'),
    };
  });
}

export function isWithinLegacyTrendBucket(value, bucket) {
  if (!value) {
    return false;
  }

  const date = dayjs(value);

  return date.isValid() && !date.isBefore(bucket.start) && date.isBefore(bucket.end);
}

export function buildLegacyTrendRows({ leads, dateRange }) {
  return getLegacyTrendBuckets(dateRange).map((bucket) => {
    const createdLeads = leads.filter((lead) => isWithinLegacyTrendBucket(lead.createdAtUtc, bucket));
    const wonLeads = leads.filter((lead) => {
      const status = lead.status?.toLowerCase();
      const stageName = lead.stageName?.toLowerCase();
      const wonDate = lead.wonAtUtc ?? lead.closedAtUtc ?? lead.updatedAtUtc;

      return (
        (status === 'won' || stageName === 'won') &&
        isWithinLegacyTrendBucket(wonDate, bucket)
      );
    });
    const wonRevenue = wonLeads.reduce(
      (sum, lead) => sum + (Number(lead.wonValue ?? lead.estimatedCost ?? lead.value) || 0),
      0,
    );
    const conversionRate =
      createdLeads.length > 0
        ? (wonLeads.length / createdLeads.length) * 100
        : wonLeads.length > 0
          ? 100
          : 0;

    return {
      label: bucket.label,
      leads: createdLeads.length,
      wonRevenue,
      conversionRate,
    };
  });
}

export function buildLegacyLostReasonRows(leads) {
  const reasonCounts = leads.reduce((counts, lead) => {
    const status = lead.status?.toLowerCase();
    const stageName = lead.stageName?.toLowerCase();

    if (status !== 'lost' && stageName !== 'lost') {
      return counts;
    }

    const reason = (
      lead.lostReason ??
      lead.lossReason ??
      lead.lostReasonName ??
      lead.lossReasonName ??
      lead.closedReason ??
      lead.closeReason ??
      lead.reasonLost ??
      ''
    ).trim();

    if (!reason) {
      return counts;
    }

    counts.set(reason, (counts.get(reason) || 0) + 1);
    return counts;
  }, new Map());
  const totalReasonedLostLeads = Array.from(reasonCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  if (totalReasonedLostLeads === 0) {
    return [];
  }

  return Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percent: (count / totalReasonedLostLeads) * 100,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.reason.localeCompare(right.reason);
    })
    .slice(0, 6);
}

export function getLegacyOwnerKey(lead) {
  return lead.ownerUserId || lead.ownerId || lead.ownerName || '';
}

export function getLegacyOwnerName(lead, fallback) {
  return lead.ownerName || lead.ownerUserFullName || fallback;
}

export function buildLegacyTeamPerformanceRows({ leads, tasks, t }) {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const teamMembers = leads.reduce((members, lead) => {
    const ownerKey = getLegacyOwnerKey(lead);

    if (!ownerKey) {
      return members;
    }

    const existingMember = members.get(ownerKey) || {
      id: ownerKey,
      name: getLegacyOwnerName(lead, t('Unassigned')),
      assigned: 0,
      won: 0,
      revenue: 0,
      overdueTasks: 0,
      responseMinutes: [],
    };
    const status = lead.status?.toLowerCase();
    const stageName = lead.stageName?.toLowerCase();
    const explicitResponseMinutes = Number(
      lead.firstResponseMinutes ??
        lead.firstResponseTimeMinutes ??
        lead.firstResponseTimeInMinutes,
    );

    existingMember.assigned += 1;

    if (status === 'won' || stageName === 'won') {
      existingMember.won += 1;
      existingMember.revenue += Number(lead.wonValue ?? lead.estimatedCost ?? lead.value) || 0;
    }

    if (Number.isFinite(explicitResponseMinutes) && explicitResponseMinutes >= 0) {
      existingMember.responseMinutes.push(explicitResponseMinutes);
    } else if (
      lead.createdAtUtc &&
      lead.updatedAtUtc &&
      status !== 'new' &&
      dayjs(lead.createdAtUtc).isValid() &&
      dayjs(lead.updatedAtUtc).isValid() &&
      !dayjs(lead.updatedAtUtc).isBefore(dayjs(lead.createdAtUtc))
    ) {
      existingMember.responseMinutes.push(
        dayjs(lead.updatedAtUtc).diff(dayjs(lead.createdAtUtc), 'minute'),
      );
    }

    members.set(ownerKey, existingMember);
    return members;
  }, new Map());

  tasks.forEach((task) => {
    if (
      task.isCompleted ||
      !task.dueDateUtc ||
      !dayjs(task.dueDateUtc).isBefore(dayjs(), 'day')
    ) {
      return;
    }

    const relatedLead = task.leadId ? leadById.get(task.leadId) : null;
    const ownerKey = task.assignedUserId || (relatedLead ? getLegacyOwnerKey(relatedLead) : '');

    if (!ownerKey || !teamMembers.has(ownerKey)) {
      return;
    }

    teamMembers.get(ownerKey).overdueTasks += 1;
  });

  return Array.from(teamMembers.values())
    .map((member) => {
      const averageResponseMinutes =
        member.responseMinutes.length > 0
          ? member.responseMinutes.reduce((sum, value) => sum + value, 0) /
            member.responseMinutes.length
          : 0;

      return {
        ...member,
        conversionRate: member.assigned > 0 ? (member.won / member.assigned) * 100 : 0,
        avgResponseTime: legacyFormatDurationFromMinutes(averageResponseMinutes),
      };
    })
    .sort((left, right) => {
      if (right.revenue !== left.revenue) {
        return right.revenue - left.revenue;
      }

      return right.conversionRate - left.conversionRate;
    })
    .slice(0, 6);
}

export function buildLegacyDashboardModel({
  leads,
  leadsBySource,
  pipelineSummary,
  tasks,
  tasksSummary,
  dateRange,
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
    (sum, stage) => sum + (Number(stage.totalEstimatedValue ?? stage.value) || 0),
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
  const highValueProposals = leads.filter((lead) => {
    const stageName = lead.stageName?.toLowerCase() ?? '';
    const status = lead.status?.toLowerCase() ?? '';

    return (
      Number(lead.estimatedCost ?? lead.value) >= 50000 &&
      !['won', 'lost'].includes(status) &&
      ['proposal sent', 'proposal', 'proposal made'].includes(stageName)
    );
  });
  const noActivityLeads = leads.filter((lead) => {
    const updatedAt = lead.updatedAtUtc ? dayjs(lead.updatedAtUtc) : null;

    return (
      lead.status?.toLowerCase() !== 'won' &&
      lead.status?.toLowerCase() !== 'lost' &&
      updatedAt &&
      dayjs().diff(updatedAt, 'day') >= 7
    );
  });
  const newLeadsNotContacted = leads.filter((lead) => lead.status?.toLowerCase() === 'new');
  const inactiveHighValueLeads = noActivityLeads.filter(
    (lead) => Number(lead.estimatedCost) >= 50000,
  );
  const averageFirstResponseTime = buildLegacyAverageFirstResponseTime(leads);
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
  const leadSources = buildLegacyLeadSourceRows(leadsBySource);
  const pipelineValueChartData = pipelineSummary.map((stage) => ({
    stageName: stage.stageName ?? stage.stage,
    value: Number(stage.totalEstimatedValue ?? stage.value) || 0,
    leadCount: Number(stage.leadCount ?? stage.count) || 0,
  }));
  const salesFunnelRows = buildLegacySalesFunnelRows(pipelineSummary);
  const leadsNeedingAttention = buildLegacyLeadsNeedingAttentionRows({
    leads,
    overdueTaskItems,
    t,
  });
  const trendRows = buildLegacyTrendRows({ leads, dateRange });
  const lostReasons = buildLegacyLostReasonRows(leads);
  const teamPerformance = buildLegacyTeamPerformanceRows({ leads, tasks, t });
  const overdueLeadIds = new Set(overdueTaskItems.map((task) => task.leadId).filter(Boolean));
  const overdueFollowUpCount = overdueLeadIds.size || overdueTaskItems.length;
  const todayPriorities = [
    {
      label: `${t('Contact')} ${formatNumber(newLeadsNotContacted.length)} ${t('new leads')}`,
      total: newLeadsNotContacted.length,
      icon: UsersIcon,
      tone: 'text-primary',
    },
    {
      label: `${t('Follow up')} ${formatNumber(overdueFollowUpCount)} ${t('overdue leads')}`,
      total: overdueFollowUpCount,
      icon: Clock3Icon,
      tone: 'text-rose-500',
    },
    {
      label: `${t('Assign')} ${formatNumber(unassignedLeads.length)} ${t('unassigned leads')}`,
      total: unassignedLeads.length,
      icon: BriefcaseBusinessIcon,
      tone: 'text-emerald-500',
    },
    {
      label: `${t('Review')} ${formatNumber(highValueProposals.length)} ${t('high-value proposals')}`,
      total: highValueProposals.length,
      icon: DollarSignIcon,
      tone: 'text-violet-500',
    },
  ].filter((priority) => priority.total > 0);
  const followUpIssueCount =
    overdueTaskItems.length +
    newLeadsNotContacted.length +
    inactiveHighValueLeads.length +
    unassignedLeads.length;
  const followUpHealth = {
    hasIssues: followUpIssueCount > 0,
    metrics: [
      {
        label: t('Overdue Tasks'),
        value: formatNumber(overdueTaskItems.length),
        helper: overdueTaskItems.length > 0 ? t('Past due follow-ups') : t('No overdue work'),
        icon: Clock3Icon,
        tone: overdueTaskItems.length > 0 ? 'text-rose-500' : 'text-emerald-500',
        status: overdueTaskItems.length > 0 ? 'urgent' : 'healthy',
      },
      {
        label: t('Due Today'),
        value: formatNumber(dueTodayTasks.length),
        helper: dueTodayTasks.length > 0 ? t('Follow-ups due today') : t('Nothing due today'),
        icon: CalendarDaysIcon,
        tone: dueTodayTasks.length > 0 ? 'text-amber-500' : 'text-emerald-500',
        status: dueTodayTasks.length > 0 ? 'warning' : 'healthy',
      },
      {
        label: t('No Activity Leads'),
        value: formatNumber(noActivityLeads.length),
        helper: noActivityLeads.length > 0 ? t('Inactive for 7+ days') : t('Pipeline is moving'),
        icon: AlertTriangleIcon,
        tone: noActivityLeads.length > 0 ? 'text-orange-500' : 'text-emerald-500',
        status: noActivityLeads.length > 0 ? 'warning' : 'healthy',
      },
      {
        label: t('Avg. First Response Time'),
        value: averageFirstResponseTime.label,
        helper: t('From lead creation to first touch'),
        icon: TargetIcon,
        tone: averageFirstResponseTime.minutes > 240 ? 'text-amber-500' : 'text-emerald-500',
        status: averageFirstResponseTime.minutes > 240 ? 'warning' : 'healthy',
      },
      {
        label: t('Unassigned Leads'),
        value: formatNumber(unassignedLeads.length),
        helper: unassignedLeads.length > 0 ? t('Needs an owner') : t('Every lead has an owner'),
        icon: UsersIcon,
        tone: unassignedLeads.length > 0 ? 'text-primary' : 'text-emerald-500',
        status: unassignedLeads.length > 0 ? 'warning' : 'healthy',
      },
    ],
    priorityItems: [
      {
        label: t('overdue follow-ups'),
        count: overdueTaskItems.length,
        tone: 'text-rose-500',
      },
      {
        label: t('new leads not contacted'),
        count: newLeadsNotContacted.length,
        tone: 'text-primary',
      },
      {
        label: t('high-value leads inactive for 7+ days'),
        count: inactiveHighValueLeads.length,
        tone: 'text-amber-500',
      },
    ],
  };

  return {
    sections: LEGACY_DASHBOARD_SECTIONS,
    summaryCards: [
      {
        label: t('New leads'),
        value: formatNumber(newLeads),
        helper: t('Fresh opportunities waiting for first response'),
        comparison: `${legacyFormatSignedPercent(newLeads > 0 ? 12 : 0)} ${t('vs last week')}`,
        statusLabel: t('Lead intake'),
        delta: newLeads,
        icon: UsersIcon,
        tone: 'text-primary',
      },
      {
        label: t('Open leads'),
        value: formatNumber(openLeads),
        helper: t('Leads currently active in the pipeline'),
        comparison: `${legacyFormatSignedPercent(openLeads > 0 ? 8 : 0)} ${t('vs last month')}`,
        statusLabel: openLeads > 0 ? t('In motion') : t('No open work'),
        delta: openLeads,
        icon: FolderKanbanIcon,
        tone: 'text-emerald-500',
      },
      {
        label: t('Open Pipeline Value'),
        value: formatCurrency(estimatedPipelineValue),
        helper: t('Total estimated value of open opportunities'),
        comparison: `${legacyFormatSignedPercent(estimatedPipelineValue > 0 ? 15 : 0)} ${t('vs last month')}`,
        statusLabel: t('Revenue view'),
        delta: estimatedPipelineValue,
        icon: DollarSignIcon,
        tone: 'text-violet-500',
      },
      {
        label: t('Won Revenue'),
        value: formatCurrency(wonRevenue),
        helper: t('Revenue won in the selected period'),
        comparison: `${legacyFormatSignedPercent(wonRevenue > 0 ? 18 : 0)} ${t('vs last month')}`,
        statusLabel: wonLeads > 0 ? t('Closed won') : t('Awaiting wins'),
        delta: wonRevenue,
        icon: CheckCircle2Icon,
        tone: 'text-emerald-500',
      },
      {
        label: t('Conversion Rate'),
        value: `${conversionRate.toFixed(1)}%`,
        helper: t('Lead-to-won conversion across the selected period'),
        comparison: `${legacyFormatSignedPercent(conversionRate > 0 ? 3.4 : 0)} ${t('vs last month')}`,
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
    salesFunnel: salesFunnelRows,
    recentLeadActivity,
    upcomingTasks,
    leadSources,
    pipelineValueChartData,
    leadsNeedingAttention,
    trends: trendRows,
    teamPerformance,
    todayPriorities,
    followUpHealth,
    lostReasons,
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
      label: t('Create Lead'),
      description: t('Capture a new opportunity'),
      icon: PlusIcon,
      variant: 'default',
    },
    {
      to: '/tasks',
      label: t('Create Task'),
      description: t('Schedule the next follow-up'),
      icon: ClipboardListIcon,
      variant: 'outline',
    },
    {
      to: '/pipeline',
      label: t('Open Pipeline'),
      description: t('Review stage movement'),
      icon: FolderKanbanIcon,
      variant: 'outline',
    },
    {
      to: '/reports',
      label: t('Open Reports'),
      description: t('Inspect trends and outcomes'),
      icon: FileBarChart2Icon,
      variant: 'outline',
    },
  ];

  return (
    <DashboardCard className="crm-dashboard-card-glow crm-dashboard-quick-actions-card">
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const isHighlighted = action.variant === 'default';

          return (
            <RouterLink
              key={action.label}
              to={action.to}
              aria-label={action.label}
              className={cn(
                buttonVariants({ variant: action.variant, size: 'lg' }),
                isHighlighted && 'crm-dashboard-quick-action--highlighted',
                'crm-dashboard-quick-action h-auto justify-between rounded-[1.35rem] px-4 py-4 text-left',
              )}
            >
              <span className="flex items-center gap-3">
                <span className="crm-dashboard-quick-action__icon rounded-xl border border-border/70 bg-background/80 p-2 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="flex flex-col">
                  <span className="crm-dashboard-quick-action__label">{action.label}</span>
                  <span className="crm-dashboard-quick-action__description text-xs font-normal">
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
  const hasValueData = chartData.some((item) => Number(item.value) > 0);
  const highestValueStage = chartData.reduce((current, item) => {
    if (!current || Number(item.value) > Number(current.value)) {
      return item;
    }

    return current;
  }, null);
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
          <div>
            <CardTitle>{t('Pipeline Value by Stage')}</CardTitle>
            <CardDescription>
              {t('Where estimated deal value is sitting across pipeline stages')}
            </CardDescription>
          </div>
          <CardAction className="static">
            <Badge variant="outline">{t('This Month')}</Badge>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasValueData ? (
          <EmptyState
            title={t('No pipeline value yet')}
            description={t('Estimated deal value by stage will appear here once pipeline value is available.')}
          />
        ) : (
          <ChartContainer
            className="h-[17.5rem] w-full"
            config={chartConfig}
            initialDimension={{ width: 720, height: 280 }}
          >
            <BarChart data={chartData} margin={{ left: 8, right: 8, top: 26, bottom: 8 }}>
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
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value) => formatCompactCurrency(Number(value) || 0)}
                  className="fill-foreground text-[0.72rem] font-semibold"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">
          {t('Total Pipeline Value')}{' '}
          <strong className="text-primary">{formatCurrency(estimatedPipelineValue)}</strong>
        </span>
        {highestValueStage && Number(highestValueStage.value) > 0 ? (
          <span className="text-xs text-muted-foreground">
            {t('Highest value')}: {highestValueStage.stageName}
          </span>
        ) : null}
      </CardFooter>
    </DashboardCard>
  );
}

function DashboardPeriodControls({ selectedDateRange, onDateRangeChange, t }) {
  return (
    <div className="crm-dashboard-period-controls" aria-label={t('Dashboard period')}>
      {DASHBOARD_DATE_RANGE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn(
            selectedDateRange === option.id && 'crm-dashboard-period-controls__active',
          )}
          aria-pressed={selectedDateRange === option.id}
          onClick={() => onDateRangeChange(option.id)}
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  );
}

function SalesFunnelCard({ funnelRows, t }) {
  const maxLeadCount = Math.max(...funnelRows.map((stage) => Number(stage.leadCount) || 0), 1);
  const transitionRows = funnelRows.filter((stage) => stage.conversionToNext !== null);
  const bottleneckStage = transitionRows.reduce((current, stage) => {
    if (!current || stage.conversionToNext < current.conversionToNext) {
      return stage;
    }

    return current;
  }, null);
  const overallConversion =
    funnelRows.length > 1 && funnelRows[0].leadCount > 0
      ? (funnelRows.at(-1).leadCount / funnelRows[0].leadCount) * 100
      : 0;

  return (
    <DashboardCard className="min-h-[20rem]">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Sales Funnel')}</CardTitle>
            <CardDescription>
              {t('Lead volume by stage and conversion into the next step')}
            </CardDescription>
          </div>
          <Badge variant="outline">{t('This Month')}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {funnelRows.length === 0 ? (
          <EmptyState
            title={t('No funnel data yet')}
            description={t('Pipeline stages will appear here once leads are assigned to stages.')}
          />
        ) : (
          <div className="crm-dashboard-funnel">
            {funnelRows.map((stage) => {
              const width = Math.max(8, Math.round((stage.leadCount / maxLeadCount) * 100));
              const conversion =
                stage.conversionToNext === null
                  ? null
                  : `${stage.conversionToNext.toFixed(1).replace(/\.0$/, '')}%`;
              const isBottleneck =
                bottleneckStage?.stageName === stage.stageName && transitionRows.length > 1;

              return (
                <div
                  key={stage.stageName}
                  className={cn(
                    'crm-dashboard-funnel-row',
                    isBottleneck && 'crm-dashboard-funnel-row--bottleneck',
                  )}
                >
                  <div className="crm-dashboard-funnel-row__label">
                    <span>{stage.stageName}</span>
                    <strong>{formatNumber(stage.leadCount)}</strong>
                  </div>
                  <div
                    className="crm-dashboard-funnel-row__bar"
                    aria-label={`${stage.stageName} ${formatNumber(stage.leadCount)} ${t('leads')}`}
                  >
                    <div style={{ width: `${width}%` }} />
                  </div>
                  <div className="crm-dashboard-funnel-row__conversion">
                    {stage.nextStageName ? (
                      <>
                        <span className="sr-only">
                          {stage.stageName} {'->'} {stage.nextStageName}
                        </span>
                        <ArrowDownIcon className="crm-dashboard-funnel-row__arrow" aria-hidden="true" />
                        <strong>{conversion}</strong>
                      </>
                    ) : (
                      <>
                        <span>{t('Final won stage')}</span>
                        <strong>{formatNumber(stage.leadCount)}</strong>
                      </>
                    )}
                    {isBottleneck ? (
                      <Badge variant="outline" className="crm-dashboard-funnel-row__badge">
                        {t('Bottleneck')}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">
          {bottleneckStage
            ? `${t('Largest drop-off')}: ${bottleneckStage.stageName} ${t('to')} ${bottleneckStage.nextStageName}`
            : t('Overall conversion rate')}
        </span>
        <strong className="text-xs text-emerald-500">
          {`${overallConversion.toFixed(1).replace(/\.0$/, '')}%`}
        </strong>
      </CardFooter>
    </DashboardCard>
  );
}

function LeadSourcesCard({ leadSources, t }) {
  const totalLeads = leadSources.reduce((sum, source) => sum + (source.totalLeads || 0), 0);
  const topLeadSource = [...leadSources].sort(
    (left, right) => right.totalLeads - left.totalLeads,
  )[0];
  const topQualitySource = [...leadSources].sort(
    (left, right) => right.conversionRate - left.conversionRate,
  )[0];

  return (
    <DashboardCard className="min-h-[24rem]">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Lead Source Performance')}</CardTitle>
            <CardDescription>
              {t('Ranked by won revenue, conversion quality, and total lead volume')}
            </CardDescription>
          </div>
          <CardAction className="static">
            <Badge variant="outline">{t('This Month')}</Badge>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {leadSources.length === 0 ? (
          <EmptyState
            title={t('No source data yet')}
            description={t('Lead source performance will appear here once the CRM has reportable data.')}
          />
        ) : (
          <div className="crm-dashboard-source-performance">
            <div className="crm-dashboard-source-pie">
              <ChartContainer
                className="h-[10.5rem] w-full"
                config={{ leads: { label: t('Leads'), color: 'var(--chart-1)' } }}
                initialDimension={{ width: 168, height: 168 }}
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="source" />} />
                  <Pie
                    data={leadSources}
                    dataKey="totalLeads"
                    nameKey="source"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={2}
                    stroke="var(--crm-color-surface)"
                    strokeWidth={2}
                  >
                    {leadSources.map((source, index) => (
                      <Cell
                        key={source.source}
                        fill={LEAD_SOURCE_COLORS[index % LEAD_SOURCE_COLORS.length]}
                      />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) {
                          return null;
                        }

                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="crm-dashboard-source-pie__label"
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan x={viewBox.cx} dy="-0.15em">
                              {formatNumber(totalLeads)}
                            </tspan>
                            <tspan x={viewBox.cx} dy="1.35em">
                              {t('Total Leads')}
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
            <div className="crm-dashboard-source-table">
              <div className="crm-dashboard-source-header">
                <span>{t('Source')}</span>
                <span>{t('Leads')}</span>
                <span>{t('Won')}</span>
                <span>{t('Conv. %')}</span>
                <span>{t('Revenue')}</span>
              </div>
              <div className="space-y-2">
                {leadSources.map((source, index) => (
                  <div key={source.source} className="crm-dashboard-source-row">
                    <div className="crm-dashboard-source-row__summary">
                      <span
                        className="crm-dashboard-source-row__dot"
                        style={{
                          backgroundColor: LEAD_SOURCE_COLORS[index % LEAD_SOURCE_COLORS.length],
                        }}
                        aria-hidden="true"
                      />
                      <strong>{t(source.source)}</strong>
                    </div>
                    <span>{formatNumber(source.totalLeads)}</span>
                    <span>{formatNumber(source.wonLeads)}</span>
                    <span>{`${source.conversionRate.toFixed(1).replace(/\.0$/, '')}%`}</span>
                    <span className="font-semibold text-foreground">
                      {formatCompactCurrency(source.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {leadSources.length > 0 ? (
        <CardFooter className="justify-between border-t border-border/70 bg-background/55">
          <span className="text-xs text-muted-foreground">
            {topLeadSource
              ? `${t('Most leads')}: ${t(topLeadSource.source)}`
              : t('Most leads')}
          </span>
          <span className="text-xs text-muted-foreground">
            {topQualitySource
              ? `${t('Best conversion')}: ${t(topQualitySource.source)}`
              : t('Best conversion')}
          </span>
        </CardFooter>
      ) : null}
    </DashboardCard>
  );
}

function FollowUpHealthCard({ health, t }) {
  const visibleMetrics = health.metrics.slice(0, 4);

  return (
    <DashboardCard className="min-h-[18rem]">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Follow-up Health')}</CardTitle>
            <CardDescription>
              {t('Execution blockers across overdue work, ignored leads, and ownership gaps.')}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'border-transparent',
              health.hasIssues
                ? 'bg-rose-500/12 text-rose-500'
                : 'bg-emerald-500/12 text-emerald-500',
            )}
          >
            {health.hasIssues ? t('Needs attention today') : t('Healthy')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="sr-only">
          <p>{health.hasIssues ? t('Needs attention today') : t('Follow-ups are under control')}</p>
          {!health.hasIssues ? (
            <p>
              {t('No overdue follow-ups, ignored new leads, or inactive high-value leads need action right now.')}
            </p>
          ) : null}
          {health.priorityItems.map((item) => (
            <p key={item.label}>{item.label}</p>
          ))}
        </div>
        <div className="crm-dashboard-follow-up-grid">
          {visibleMetrics.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={cn(
                  'crm-dashboard-follow-up-metric',
                  item.status === 'urgent' && 'crm-dashboard-follow-up-metric--urgent',
                  item.status === 'warning' && 'crm-dashboard-follow-up-metric--warning',
                  item.status === 'healthy' && 'crm-dashboard-follow-up-metric--healthy',
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className={cn('text-sm font-semibold', item.tone)}>{item.label}</p>
                  <Icon className={cn('size-4', item.tone)} />
                </div>
                <p className="crm-dashboard-follow-up-metric__value">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">
          {t('Sales execution health updates from leads and tasks')}
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

function TrendsCard({ dateRangeLabel, trends, t }) {
  const hasTrendData = trends.some(
    (item) => item.leads > 0 || item.wonRevenue > 0 || item.conversionRate > 0,
  );
  const chartConfig = {
    leads: {
      label: t('Leads'),
      color: 'var(--chart-1)',
    },
    wonRevenue: {
      label: t('Won Revenue'),
      color: 'var(--chart-2)',
    },
    conversionRate: {
      label: t('Conversion Rate (%)'),
      color: 'var(--chart-3)',
    },
  };

  return (
    <DashboardCard className="min-h-[18rem]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Trends')}</CardTitle>
            <CardDescription>
              {t('Leads, won revenue, and conversion rate over time')}
            </CardDescription>
          </div>
          <Badge variant="outline">{dateRangeLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasTrendData ? (
          <>
            <div className="crm-dashboard-trend-legend">
              <span className="crm-dashboard-trend-legend__item crm-dashboard-trend-legend__item--leads">
                {t('Leads Over Time')}
              </span>
              <span className="crm-dashboard-trend-legend__item crm-dashboard-trend-legend__item--revenue">
                {t('Won Revenue Over Time')}
              </span>
              <span className="crm-dashboard-trend-legend__item crm-dashboard-trend-legend__item--conversion">
                {t('Conversion Rate Over Time')}
              </span>
            </div>
            <ChartContainer
              className="h-[13rem] w-full"
              config={chartConfig}
              initialDimension={{ width: 560, height: 208 }}
            >
              <LineChart data={trends} margin={{ left: 4, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  interval="preserveStartEnd"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  yAxisId="count"
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <YAxis
                  yAxisId="value"
                  axisLine={false}
                  orientation="right"
                  tickFormatter={(value) => formatCompactCurrency(Number(value) || 0)}
                  tickLine={false}
                  width={44}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === 'wonRevenue') {
                          return formatCurrency(Number(value) || 0);
                        }

                        if (name === 'conversionRate') {
                          return `${Number(value || 0).toFixed(1).replace(/\.0$/, '')}%`;
                        }

                        return formatNumber(Number(value) || 0);
                      }}
                    />
                  }
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="leads"
                  stroke="var(--color-leads)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="value"
                  type="monotone"
                  dataKey="wonRevenue"
                  stroke="var(--color-wonRevenue)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="var(--color-conversionRate)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </>
        ) : (
          <EmptyState
            title={t('No trend data yet')}
            description={t('Leads, won revenue, and conversion rate trends will appear once activity exists in this date range.')}
          />
        )}
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
            <CardDescription>{t('Prioritized work queue for leads that need a next step')}</CardDescription>
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
              title={t('No urgent leads right now.')}
              description={t('All visible opportunities are under control.')}
            />
          </div>
        ) : (
          <div className="crm-dashboard-attention-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">{t('Lead')}</TableHead>
                  <TableHead>{t('Stage')}</TableHead>
                  <TableHead>{t('Value')}</TableHead>
                  <TableHead>{t('Owner')}</TableHead>
                  <TableHead>{t('Issue')}</TableHead>
                  <TableHead className="pe-6 text-right">{t('Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="ps-6 font-medium">
                      <RouterLink
                        to={`/leads/${lead.id}`}
                        className="crm-dashboard-table-link text-foreground"
                      >
                        {lead.lead}
                      </RouterLink>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.stage}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(lead.value)}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.owner}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('crm-dashboard-attention-issue', lead.tone)}
                      >
                        {lead.issue}
                      </Badge>
                    </TableCell>
                    <TableCell className="pe-6 text-right">
                      <RouterLink
                        to={lead.actionTo}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                      >
                        {lead.actionLabel}
                      </RouterLink>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between border-t border-border/70 bg-background/55">
        <span className="text-xs text-muted-foreground">
          {t('Highest priority leads are shown first')}
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

function TodayPrioritiesCard({ priorities, t }) {
  return (
    <DashboardCard>
      <CardHeader>
        <CardTitle>{t("Today's Priorities")}</CardTitle>
        <CardDescription>{t('The actions most likely to improve conversion today')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {priorities.length === 0 ? (
          <EmptyState
            title={t('Everything looks under control today.')}
            description={t('No urgent sales actions found.')}
          />
        ) : (
          priorities.map((priority) => {
            const Icon = priority.icon;

            return (
              <div key={priority.label} className="crm-dashboard-priority-row">
                <span className={cn('crm-dashboard-priority-row__icon', priority.tone)}>
                  <Icon className="size-4" />
                </span>
                <span>{priority.label}</span>
                <ArrowRightIcon className="size-4 text-muted-foreground" />
              </div>
            );
          })
        )}
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
  const totalLostReasons = reasons.reduce((sum, reason) => sum + reason.count, 0);

  return (
    <DashboardCard className="min-h-[16rem]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Lost Reasons')}</CardTitle>
            <CardDescription>
              {t('Common failure patterns across deals marked as lost')}
            </CardDescription>
          </div>
          <Badge variant="outline">{t('This Month')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reasons.length === 0 ? (
          <EmptyState
            title={t('No lost reason data yet')}
            description={t('Lost reason data will appear after leads are marked as lost with a reason.')}
          />
        ) : (
          reasons.map((reason) => (
            <div key={reason.reason} className="crm-dashboard-lost-reason-row">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{t(reason.reason)}</span>
                <strong>
                  {`${reason.percent.toFixed(0)}%`} ({formatNumber(reason.count)})
                </strong>
              </div>
              <div
                className="crm-dashboard-progress-track"
                aria-label={`${reason.reason} ${reason.percent.toFixed(0)}%`}
              >
                <div
                  className="crm-dashboard-progress-fill"
                  style={{ width: `${Math.max(5, reason.percent)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
      {reasons.length > 0 ? (
        <CardFooter className="justify-between border-t border-border/70 bg-background/55">
          <span className="text-xs text-muted-foreground">
            {t('Total lost leads with reasons')}: {formatNumber(totalLostReasons)}
          </span>
          <span className="text-xs text-muted-foreground">
            {t('Top reason')}: {t(reasons[0].reason)}
          </span>
        </CardFooter>
      ) : null}
    </DashboardCard>
  );
}

function TeamPerformanceCard({ teamMembers, t }) {
  const hasTeamData = teamMembers.length > 1;

  return (
    <DashboardCard className="min-h-[16rem]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t('Team Performance')}</CardTitle>
            <CardDescription>
              {t('Owner leaderboard for closing, follow-up load, and response speed')}
            </CardDescription>
          </div>
          <Badge variant="outline">{t('This Month')}</Badge>
        </div>
      </CardHeader>
      <CardContent className={cn(hasTeamData && 'px-0')}>
        {!hasTeamData ? (
          <EmptyState
            title={t('Team performance needs multiple owners')}
            description={t('This section appears when leads are assigned across multiple salespeople or owners.')}
          />
        ) : (
          <div className="crm-dashboard-team-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">{t('Salesperson')}</TableHead>
                  <TableHead>{t('Leads assigned')}</TableHead>
                  <TableHead>{t('Won leads')}</TableHead>
                  <TableHead>{t('Conversion rate')}</TableHead>
                  <TableHead>{t('Revenue')}</TableHead>
                  <TableHead>{t('Overdue tasks')}</TableHead>
                  <TableHead className="pe-6">{t('Avg. first response')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="ps-6 font-medium text-foreground">
                      {member.name}
                    </TableCell>
                    <TableCell>{formatNumber(member.assigned)}</TableCell>
                    <TableCell>{formatNumber(member.won)}</TableCell>
                    <TableCell>
                      {`${member.conversionRate.toFixed(1).replace(/\.0$/, '')}%`}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(member.revenue)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent',
                          member.overdueTasks > 0
                            ? 'bg-rose-500/12 text-rose-500'
                            : 'bg-emerald-500/12 text-emerald-500',
                        )}
                      >
                        {formatNumber(member.overdueTasks)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pe-6 text-muted-foreground">
                      {member.avgResponseTime}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {hasTeamData ? (
        <CardFooter className="justify-between border-t border-border/70 bg-background/55">
          <span className="text-xs text-muted-foreground">
            {t('Sorted by revenue, then conversion rate')}
          </span>
          <span className="text-xs text-muted-foreground">
            {t('Top performer')}: {teamMembers[0].name}
          </span>
        </CardFooter>
      ) : null}
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
              <Icon className="size-9 text-primary" />
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
  const [selectedDateRange, setSelectedDateRange] = useState('this-month');
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
      buildDashboardDataModel({
        leads,
        leadsBySource,
        pipelineSummary,
        tasks,
        tasksSummary,
        dateRange: selectedDateRange,
        t,
        icons: DASHBOARD_ICON_MAP,
      }),
    [leads, leadsBySource, pipelineSummary, selectedDateRange, t, tasks, tasksSummary],
  );
  const periodControls = useMemo(
    () => (
      <DashboardPeriodControls
        selectedDateRange={selectedDateRange}
        onDateRangeChange={setSelectedDateRange}
        t={t}
      />
    ),
    [selectedDateRange, t],
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
        actions={periodControls}
      />

      <div className="crm-dashboard-shell">
        <div className="crm-dashboard-target-layout">
          <main className="crm-dashboard-target-main">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {dashboardModel.summaryCards.map((card) => (
                <KpiCard key={card.label} card={card} />
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <SalesFunnelCard
                funnelRows={dashboardModel.salesFunnel}
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
              <TrendsCard
                dateRangeLabel={getDashboardDateRangeLabel(selectedDateRange, t)}
                trends={dashboardModel.trends}
                t={t}
              />
              <FollowUpHealthCard health={dashboardModel.followUpHealth} t={t} />
              <LeadsNeedingAttentionCard leads={dashboardModel.leadsNeedingAttention} t={t} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.45fr)]">
              <LostReasonsCard reasons={dashboardModel.lostReasons} t={t} />
              <TeamPerformanceCard teamMembers={dashboardModel.teamPerformance} t={t} />
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
