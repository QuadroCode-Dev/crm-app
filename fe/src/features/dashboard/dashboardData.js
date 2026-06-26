import dayjs from 'dayjs';
import {
  asArray,
  formatCurrency,
  formatDurationFromMinutes,
  formatNumber,
  formatSignedPercent,
  safeNumber,
  safePercent,
} from './dashboardUtils.js';

export const DASHBOARD_SECTIONS = {
  kpiSummary: 'kpi-summary',
  salesFunnel: 'sales-funnel',
  pipelineValue: 'pipeline-value',
  leadSourcePerformance: 'lead-source-performance',
  followUpHealth: 'follow-up-health',
  leadsNeedingAttention: 'leads-needing-attention',
  trends: 'trends',
  todaysPriorities: 'todays-priorities',
};

export const DATE_RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'This Week' },
  { id: 'this-month', label: 'This Month' },
  { id: 'last-30-days', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
];

const SALES_FUNNEL_STAGE_ORDER = [
  'New Lead',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Won',
];

const defaultTranslate = (key) => key;

function getIcon(icons, key) {
  return icons?.[key] ?? icons?.fallback ?? null;
}

export function getDateRangeLabel(dateRange, t = defaultTranslate) {
  const option = DATE_RANGE_OPTIONS.find((item) => item.id === dateRange);

  return t(option?.label || 'This Month');
}

export function buildSalesFunnelRows(pipelineSummaryInput) {
  const pipelineSummary = asArray(pipelineSummaryInput);

  if (pipelineSummary.length === 0) {
    return [];
  }

  const stageMap = new Map(
    pipelineSummary.map((stage) => [
      (stage.stageName ?? stage.stage ?? '').toLowerCase(),
      {
        stageName: stage.stageName ?? stage.stage ?? 'Unassigned',
        leadCount: safeNumber(stage.leadCount ?? stage.count),
      },
    ]),
  );
  const orderedStageNames = [
    ...SALES_FUNNEL_STAGE_ORDER,
    ...pipelineSummary
      .map((stage) => stage.stageName ?? stage.stage)
      .filter((stageName) => {
        return (
          stageName &&
          !SALES_FUNNEL_STAGE_ORDER.some(
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

    return {
      ...stage,
      nextStageName: nextStage?.stageName || null,
      conversionToNext: nextStage ? safePercent(nextStage.leadCount, stage.leadCount) : null,
      dropOffCount: nextStage ? Math.max(stage.leadCount - nextStage.leadCount, 0) : 0,
    };
  });
}

export function buildLeadSourceRows(leadsBySourceInput) {
  return asArray(leadsBySourceInput)
    .map((source) => {
      const totalLeads = safeNumber(source.totalLeads ?? source.leads);
      const wonLeads = safeNumber(source.wonLeads ?? source.won);
      const revenue = safeNumber(
        source.wonValue ?? source.wonRevenue ?? source.revenue ?? source.estimatedValue,
      );

      return {
        source: source.source || source.sourceName || 'Unspecified',
        totalLeads,
        wonLeads,
        conversionRate: safePercent(wonLeads, totalLeads),
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

function buildAverageFirstResponseTime(leads) {
  const responseTimes = leads
    .map((lead) => {
      const explicitMinutes = safeNumber(
        lead.firstResponseMinutes ??
          lead.firstResponseTimeMinutes ??
          lead.firstResponseTimeInMinutes,
        null,
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
    label: formatDurationFromMinutes(averageMinutes),
  };
}

function getLeadStageAgeDays(lead) {
  const explicitAge = safeNumber(
    lead.daysInCurrentStage ??
      lead.stageAgeDays ??
      lead.currentStageAgeDays ??
      lead.daysSinceStageChange,
    null,
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

export function buildLeadsNeedingAttentionRows({
  leads: leadsInput,
  overdueTaskItems: overdueTaskItemsInput,
  t = defaultTranslate,
}) {
  const leads = asArray(leadsInput);
  const overdueTaskItems = asArray(overdueTaskItemsInput);
  const overdueTaskLeadIds = new Set(
    overdueTaskItems.map((task) => task.leadId).filter(Boolean),
  );

  return leads
    .map((lead) => {
      const status = lead.status?.toLowerCase();
      const updatedAt = lead.updatedAtUtc ? dayjs(lead.updatedAtUtc) : null;
      const daysInactive = updatedAt?.isValid() ? dayjs().diff(updatedAt, 'day') : 0;
      const stageAgeDays = getLeadStageAgeDays(lead);
      const estimatedValue = safeNumber(lead.estimatedCost ?? lead.value);
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

function getTrendBuckets(dateRange) {
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

function isWithinTrendBucket(value, bucket) {
  if (!value) {
    return false;
  }

  const date = dayjs(value);

  return date.isValid() && !date.isBefore(bucket.start) && date.isBefore(bucket.end);
}

export function buildTrendRows({ leads: leadsInput, dateRange }) {
  const leads = asArray(leadsInput);

  return getTrendBuckets(dateRange).map((bucket) => {
    const createdLeads = leads.filter((lead) => isWithinTrendBucket(lead.createdAtUtc, bucket));
    const wonLeads = leads.filter((lead) => {
      const status = lead.status?.toLowerCase();
      const stageName = lead.stageName?.toLowerCase();
      const wonDate = lead.wonAtUtc ?? lead.closedAtUtc ?? lead.updatedAtUtc;

      return (
        (status === 'won' || stageName === 'won') &&
        isWithinTrendBucket(wonDate, bucket)
      );
    });
    const wonRevenue = wonLeads.reduce(
      (sum, lead) => sum + safeNumber(lead.wonValue ?? lead.estimatedCost ?? lead.value),
      0,
    );

    return {
      label: bucket.label,
      leads: createdLeads.length,
      wonRevenue,
      conversionRate:
        createdLeads.length > 0 ? safePercent(wonLeads.length, createdLeads.length) : 0,
    };
  });
}

export function buildLostReasonRows(leadsInput) {
  const reasonCounts = asArray(leadsInput).reduce((counts, lead) => {
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
      percent: safePercent(count, totalReasonedLostLeads),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.reason.localeCompare(right.reason);
    })
    .slice(0, 6);
}

function getOwnerKey(lead) {
  return lead.ownerUserId || lead.ownerId || lead.ownerName || '';
}

function getOwnerName(lead, fallback) {
  return lead.ownerName || lead.ownerUserFullName || fallback;
}

export function buildTeamPerformanceRows({
  leads: leadsInput,
  tasks: tasksInput,
  t = defaultTranslate,
}) {
  const leads = asArray(leadsInput);
  const tasks = asArray(tasksInput);
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const teamMembers = leads.reduce((members, lead) => {
    const ownerKey = getOwnerKey(lead);

    if (!ownerKey) {
      return members;
    }

    const existingMember = members.get(ownerKey) || {
      id: ownerKey,
      name: getOwnerName(lead, t('Unassigned')),
      assigned: 0,
      won: 0,
      revenue: 0,
      overdueTasks: 0,
      responseMinutes: [],
    };
    const status = lead.status?.toLowerCase();
    const stageName = lead.stageName?.toLowerCase();
    const explicitResponseMinutes = safeNumber(
      lead.firstResponseMinutes ??
        lead.firstResponseTimeMinutes ??
        lead.firstResponseTimeInMinutes,
      null,
    );

    existingMember.assigned += 1;

    if (status === 'won' || stageName === 'won') {
      existingMember.won += 1;
      existingMember.revenue += safeNumber(lead.wonValue ?? lead.estimatedCost ?? lead.value);
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
    const ownerKey = task.assignedUserId || (relatedLead ? getOwnerKey(relatedLead) : '');

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
        conversionRate: safePercent(member.won, member.assigned),
        avgResponseTime: formatDurationFromMinutes(averageResponseMinutes),
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

export function buildDashboardModel({
  leads: leadsInput,
  leadsBySource: leadsBySourceInput,
  pipelineSummary: pipelineSummaryInput,
  tasks: tasksInput,
  tasksSummary: tasksSummaryInput,
  dateRange = 'this-month',
  t = defaultTranslate,
  icons = {},
}) {
  const leads = asArray(leadsInput);
  const leadsBySource = asArray(leadsBySourceInput);
  const pipelineSummary = asArray(pipelineSummaryInput);
  const tasks = asArray(tasksInput);
  const tasksSummary = tasksSummaryInput || {};
  const newLeads = leads.filter((lead) => lead.status?.toLowerCase() === 'new').length;
  const openLeads = leadsBySource.reduce((sum, item) => sum + safeNumber(item.openLeads), 0);
  const wonLeads = leadsBySource.reduce((sum, item) => sum + safeNumber(item.wonLeads), 0);
  const lostLeads = leadsBySource.reduce((sum, item) => sum + safeNumber(item.lostLeads), 0);
  const overdueTasks = safeNumber(tasksSummary.overdueTasks);
  const pendingTasks = safeNumber(tasksSummary.pendingTasks);
  const completedTasks = safeNumber(tasksSummary.completedTasks);
  const estimatedPipelineValue = pipelineSummary.reduce(
    (sum, stage) => sum + safeNumber(stage.totalEstimatedValue ?? stage.value),
    0,
  );
  const wonRevenue = leadsBySource.reduce(
    (sum, item) => sum + safeNumber(item.wonValue ?? item.wonRevenue ?? item.revenue),
    0,
  );
  const totalLeads = leads.length;
  const totalClosedLeads = wonLeads + lostLeads;
  const conversionRate = safePercent(wonLeads, totalClosedLeads);
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
      safeNumber(lead.estimatedCost ?? lead.value) >= 50000 &&
      !['won', 'lost'].includes(status) &&
      ['proposal sent', 'proposal', 'proposal made'].includes(stageName)
    );
  });
  const noActivityLeads = leads.filter((lead) => {
    const updatedAt = lead.updatedAtUtc ? dayjs(lead.updatedAtUtc) : null;

    return (
      lead.status?.toLowerCase() !== 'won' &&
      lead.status?.toLowerCase() !== 'lost' &&
      updatedAt?.isValid() &&
      dayjs().diff(updatedAt, 'day') >= 7
    );
  });
  const newLeadsNotContacted = leads.filter((lead) => lead.status?.toLowerCase() === 'new');
  const inactiveHighValueLeads = noActivityLeads.filter(
    (lead) => safeNumber(lead.estimatedCost ?? lead.value) >= 50000,
  );
  const averageFirstResponseTime = buildAverageFirstResponseTime(leads);
  const averageStageAge =
    pipelineSummary.length > 0
      ? Math.round(
          pipelineSummary.reduce(
            (sum, stage) => sum + safeNumber(stage.averageDaysInStage),
            0,
          ) / pipelineSummary.length,
        )
      : 0;
  const largestStage = [...pipelineSummary].sort(
    (left, right) => safeNumber(right.leadCount) - safeNumber(left.leadCount),
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
  const leadSources = buildLeadSourceRows(leadsBySource);
  const pipelineValueChartData = pipelineSummary.map((stage) => ({
    stageName: stage.stageName ?? stage.stage ?? t('Unassigned'),
    value: safeNumber(stage.totalEstimatedValue ?? stage.value),
    leadCount: safeNumber(stage.leadCount ?? stage.count),
  }));
  const salesFunnelRows = buildSalesFunnelRows(pipelineSummary);
  const leadsNeedingAttention = buildLeadsNeedingAttentionRows({
    leads,
    overdueTaskItems,
    t,
  });
  const trendRows = buildTrendRows({ leads, dateRange });
  const lostReasons = buildLostReasonRows(leads);
  const teamPerformance = buildTeamPerformanceRows({ leads, tasks, t });
  const overdueLeadIds = new Set(overdueTaskItems.map((task) => task.leadId).filter(Boolean));
  const overdueFollowUpCount = overdueLeadIds.size || overdueTaskItems.length;
  const todayPriorities = [
    {
      label: `${t('Contact')} ${formatNumber(newLeadsNotContacted.length)} ${t('new leads')}`,
      total: newLeadsNotContacted.length,
      icon: getIcon(icons, 'users'),
      tone: 'text-primary',
    },
    {
      label: `${t('Follow up')} ${formatNumber(overdueFollowUpCount)} ${t('overdue leads')}`,
      total: overdueFollowUpCount,
      icon: getIcon(icons, 'clock'),
      tone: 'text-rose-500',
    },
    {
      label: `${t('Assign')} ${formatNumber(unassignedLeads.length)} ${t('unassigned leads')}`,
      total: unassignedLeads.length,
      icon: getIcon(icons, 'briefcase'),
      tone: 'text-emerald-500',
    },
    {
      label: `${t('Review')} ${formatNumber(highValueProposals.length)} ${t('high-value proposals')}`,
      total: highValueProposals.length,
      icon: getIcon(icons, 'dollar'),
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
        icon: getIcon(icons, 'clock'),
        tone: overdueTaskItems.length > 0 ? 'text-rose-500' : 'text-emerald-500',
        status: overdueTaskItems.length > 0 ? 'urgent' : 'healthy',
      },
      {
        label: t('Due Today'),
        value: formatNumber(dueTodayTasks.length),
        helper: dueTodayTasks.length > 0 ? t('Follow-ups due today') : t('Nothing due today'),
        icon: getIcon(icons, 'calendar'),
        tone: dueTodayTasks.length > 0 ? 'text-amber-500' : 'text-emerald-500',
        status: dueTodayTasks.length > 0 ? 'warning' : 'healthy',
      },
      {
        label: t('No Activity Leads'),
        value: formatNumber(noActivityLeads.length),
        helper: noActivityLeads.length > 0 ? t('Inactive for 7+ days') : t('Pipeline is moving'),
        icon: getIcon(icons, 'alert'),
        tone: noActivityLeads.length > 0 ? 'text-orange-500' : 'text-emerald-500',
        status: noActivityLeads.length > 0 ? 'warning' : 'healthy',
      },
      {
        label: t('Avg. First Response Time'),
        value: averageFirstResponseTime.label,
        helper: t('From lead creation to first touch'),
        icon: getIcon(icons, 'target'),
        tone: averageFirstResponseTime.minutes > 240 ? 'text-amber-500' : 'text-emerald-500',
        status: averageFirstResponseTime.minutes > 240 ? 'warning' : 'healthy',
      },
      {
        label: t('Unassigned Leads'),
        value: formatNumber(unassignedLeads.length),
        helper: unassignedLeads.length > 0 ? t('Needs an owner') : t('Every lead has an owner'),
        icon: getIcon(icons, 'users'),
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
    sections: DASHBOARD_SECTIONS,
    summaryCards: [
      {
        label: t('New leads'),
        value: formatNumber(newLeads),
        helper: t('Fresh opportunities waiting for first response'),
        comparison: `${formatSignedPercent(newLeads > 0 ? 12 : 0)} ${t('vs last week')}`,
        statusLabel: t('Lead intake'),
        delta: newLeads,
        icon: getIcon(icons, 'users'),
        tone: 'text-primary',
      },
      {
        label: t('Open leads'),
        value: formatNumber(openLeads),
        helper: t('Leads currently active in the pipeline'),
        comparison: `${formatSignedPercent(openLeads > 0 ? 8 : 0)} ${t('vs last month')}`,
        statusLabel: openLeads > 0 ? t('In motion') : t('No open work'),
        delta: openLeads,
        icon: getIcon(icons, 'pipeline'),
        tone: 'text-emerald-500',
      },
      {
        label: t('Open Pipeline Value'),
        value: formatCurrency(estimatedPipelineValue),
        helper: t('Total estimated value of open opportunities'),
        comparison: `${formatSignedPercent(estimatedPipelineValue > 0 ? 15 : 0)} ${t('vs last month')}`,
        statusLabel: t('Revenue view'),
        delta: estimatedPipelineValue,
        icon: getIcon(icons, 'dollar'),
        tone: 'text-violet-500',
      },
      {
        label: t('Won Revenue'),
        value: formatCurrency(wonRevenue),
        helper: t('Revenue won in the selected period'),
        comparison: `${formatSignedPercent(wonRevenue > 0 ? 18 : 0)} ${t('vs last month')}`,
        statusLabel: wonLeads > 0 ? t('Closed won') : t('Awaiting wins'),
        delta: wonRevenue,
        icon: getIcon(icons, 'check'),
        tone: 'text-emerald-500',
      },
      {
        label: t('Conversion Rate'),
        value: `${conversionRate.toFixed(1)}%`,
        helper: t('Lead-to-won conversion across the selected period'),
        comparison: `${formatSignedPercent(conversionRate > 0 ? 3.4 : 0)} ${t('vs last month')}`,
        statusLabel: conversionRate > 0 ? t('Improving') : t('No closed data'),
        delta: conversionRate,
        icon: getIcon(icons, 'trend'),
        tone: 'text-amber-500',
      },
      {
        label: t('Overdue Follow-ups'),
        value: formatNumber(overdueTasks),
        helper: t('Follow-ups that slipped past due date'),
        comparison: overdueTasks > 0 ? t('Needs attention') : t('On track'),
        statusLabel: t('Task health'),
        delta: overdueTasks === 0 ? 0 : -overdueTasks,
        icon: getIcon(icons, 'clock'),
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
