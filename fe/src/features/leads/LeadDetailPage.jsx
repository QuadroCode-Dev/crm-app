import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getContacts } from '../../api/contactsApi.js';
import { getLeadSources } from '../../api/leadSourcesApi.js';
import {
  deleteLead,
  getLeadById,
  getLeadDuplicates,
  getLeadStageTimer,
  getLeadTimeline,
  updateLead,
} from '../../api/leadsApi.js';
import {
  createLeadNote,
  deleteNote,
  getLeadNotes,
  updateNote,
} from '../../api/notesApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import {
  completeTask,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from '../../api/tasksApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ConfirmDialog from '../../shared/components/feedback/ConfirmDialog.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useAuth from '../../shared/hooks/useAuth.js';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import { getPipelineStages } from '../../api/pipelineApi.js';
import { getServiceNames } from '../../api/servicesApi.js';
import LeadFormDialog from './LeadFormDialog.jsx';
import NoteFormDialog from './NoteFormDialog.jsx';
import TaskFormDialog from '../tasks/TaskFormDialog.jsx';
import './leads.css';
import '../pipeline/pipeline.css';
import '../tasks/tasks.css';
import { useEffect, useState } from 'react';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PublishedWithChangesOutlinedIcon from '@mui/icons-material/PublishedWithChangesOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

const PREVIOUS_STAGES_PAGE_SIZE = 3;
const ACTIVITY_TIMELINE_PAGE_SIZE = 3;

const activityIconMap = {
  LeadCreated: CreateOutlinedIcon,
  LeadUpdated: EditOutlinedIcon,
  ContactCreated: PersonAddAltOutlinedIcon,
  ContactUpdated: PersonOutlineOutlinedIcon,
  StageChanged: PublishedWithChangesOutlinedIcon,
  NoteAdded: AddCommentOutlinedIcon,
  NoteUpdated: EditOutlinedIcon,
  NoteDeleted: DeleteOutlineOutlinedIcon,
  TaskCreated: EventAvailableOutlinedIcon,
  TaskCompleted: FactCheckOutlinedIcon,
  DuplicateWarningCreated: ContentCopyOutlinedIcon,
  LandingPageLeadReceived: FlagOutlinedIcon,
  AutomationTriggered: AutoAwesomeOutlinedIcon,
};

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY h:mm A') : '-';
}

function Field({ label, value }) {
  return (
    <Box className="crm-lead-detail__field">
      <Typography className="crm-lead-detail__field-label">{label}</Typography>
      <Typography className="crm-lead-detail__field-value">{value || '-'}</Typography>
    </Box>
  );
}

function TimelineItem({ item }) {
  const { t } = useLanguage();
  const Icon = activityIconMap[item.activityType] || CreateOutlinedIcon;
  const metadataEntries = Object.entries(item.metadata || {});

  return (
    <Box className="crm-activity-item">
      <Box className="crm-activity-item__icon">
        <Icon fontSize="small" />
      </Box>
      <Box className="crm-activity-item__content">
        <Box className="crm-activity-item__header">
          <Typography variant="subtitle2">{item.title}</Typography>
          <Typography className="crm-muted-text">{formatDate(item.createdAtUtc)}</Typography>
        </Box>
        <Typography>{item.description}</Typography>
        <Typography className="crm-muted-text">
          {item.user?.fullName ? `${t('By')} ${item.user.fullName}` : t('System activity')}
        </Typography>
        {metadataEntries.length ? (
          <Box className="crm-activity-item__meta">
            {metadataEntries.map(([key, value]) => (
              <Chip
                key={key}
                label={`${key}: ${Array.isArray(value) ? value.join(', ') : value}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function isOverdueTask(task) {
  return !task.isCompleted && task.dueDateUtc && dayjs(task.dueDateUtc).isBefore(dayjs(), 'day');
}

function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deletingNote, setDeletingNote] = useState(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [visiblePreviousStagesCount, setVisiblePreviousStagesCount] = useState(
    PREVIOUS_STAGES_PAGE_SIZE,
  );
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(
    ACTIVITY_TIMELINE_PAGE_SIZE,
  );
  const leadQuery = useQuery({
    queryKey: ['lead', id],
    queryFn: () => getLeadById(id),
    enabled: Boolean(id),
  });
  const contactsQuery = useQuery({
    queryKey: ['contacts', { page: 1, pageSize: 100 }],
    queryFn: () => getContacts({ page: 1, pageSize: 100 }),
  });
  const leadSourcesQuery = useQuery({
    queryKey: ['lead-sources'],
    queryFn: getLeadSources,
  });
  const stagesQuery = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: getPipelineStages,
  });
  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: getServiceNames,
  });
  const stageTimerQuery = useQuery({
    queryKey: ['lead-stage-timer', id],
    queryFn: () => getLeadStageTimer(id),
    enabled: Boolean(id),
  });
  const notesQuery = useQuery({
    queryKey: ['lead-notes', id],
    queryFn: () => getLeadNotes(id),
    enabled: Boolean(id),
  });
  const timelineQuery = useQuery({
    queryKey: ['lead-timeline', id],
    queryFn: () => getLeadTimeline(id),
    enabled: Boolean(id),
  });
  const duplicatesQuery = useQuery({
    queryKey: ['lead-duplicates', id],
    queryFn: () => getLeadDuplicates(id),
    enabled: Boolean(id),
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', { leadId: id, page: 1, pageSize: 100 }],
    queryFn: () => getTasks({ leadId: id, page: 1, pageSize: 100 }),
    enabled: Boolean(id),
  });

  const updateLeadMutation = useMutation({
    mutationFn: (payload) => updateLead(id, payload),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(['lead', id], updatedLead);
      queryClient.setQueriesData({ queryKey: ['leads'] }, (previousData) => {
        if (!previousData) {
          return previousData;
        }

        return {
          ...previousData,
          items: previousData.items.map((item) =>
            item.id === updatedLead.id ? { ...item, ...updatedLead } : item,
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      showNotification({
        severity: 'success',
        message: t('Lead updated successfully.'),
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

  const deleteLeadMutation = useMutation({
    mutationFn: () => deleteLead(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['lead', id] });
      queryClient.setQueriesData({ queryKey: ['leads'] }, (previousData) => {
        if (!previousData) {
          return previousData;
        }

        return {
          ...previousData,
          items: previousData.items.filter((item) => item.id !== id),
          total: Math.max(0, previousData.total - 1),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showNotification({
        severity: 'success',
        message: t('Lead deleted successfully.'),
      });
      navigate('/leads');
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (payload) => createLeadNote(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', id] });
      showNotification({
        severity: 'success',
        message: t('Note created successfully.'),
      });
      setNoteFormOpen(false);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, payload }) => updateNote(noteId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', id] });
      showNotification({
        severity: 'success',
        message: t('Note updated successfully.'),
      });
      setEditingNote(null);
      setNoteFormOpen(false);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', id] });
      showNotification({
        severity: 'success',
        message: t('Note deleted successfully.'),
      });
      setDeletingNote(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (createdTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', id] });
      showNotification({
        severity: 'success',
        message: t('Task created successfully.'),
      });
      setTaskFormOpen(false);
      setEditingTask(null);
      if (createdTask?.leadId) {
        queryClient.invalidateQueries({ queryKey: ['lead', createdTask.leadId] });
      }
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }) => updateTask(taskId, payload),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', id] });
      showNotification({
        severity: 'success',
        message: t('Task updated successfully.'),
      });
      setTaskFormOpen(false);
      setEditingTask(null);
      if (updatedTask?.leadId) {
        queryClient.invalidateQueries({ queryKey: ['lead', updatedTask.leadId] });
      }
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lead-timeline', id] });
      showNotification({
        severity: 'success',
        message: t('Task completed successfully.'),
      });
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showNotification({
        severity: 'success',
        message: t('Task deleted successfully.'),
      });
      setDeletingTask(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const previousStages = stageTimerQuery.data?.previousStages || [];
  const timelineItems = [...(timelineQuery.data || [])].sort(
    (a, b) => dayjs(b.createdAtUtc).valueOf() - dayjs(a.createdAtUtc).valueOf(),
  );

  useEffect(() => {
    setVisiblePreviousStagesCount(PREVIOUS_STAGES_PAGE_SIZE);
  }, [id, previousStages.length]);

  useEffect(() => {
    setVisibleTimelineCount(ACTIVITY_TIMELINE_PAGE_SIZE);
  }, [id, timelineItems.length]);

  if (leadQuery.isLoading) {
    return <LoadingState />;
  }

  if (leadQuery.isError) {
    const error = normalizeApiError(leadQuery.error);
    return (
      <ErrorState
        title={t('Unable to load lead details.')}
        description={error.message}
        onRetry={() => leadQuery.refetch()}
      />
    );
  }

  const lead = leadQuery.data;
  const duplicateData = duplicatesQuery.data || {
    matchedContacts: [],
    matchedLeads: [],
    matchFields: [],
  };
  const visiblePreviousStages = previousStages.slice(0, visiblePreviousStagesCount);
  const hasMorePreviousStages = visiblePreviousStages.length < previousStages.length;
  const canSeeLessPreviousStages =
    previousStages.length > PREVIOUS_STAGES_PAGE_SIZE &&
    visiblePreviousStagesCount > PREVIOUS_STAGES_PAGE_SIZE;
  const visibleTimelineItems = timelineItems.slice(0, visibleTimelineCount);
  const hasMoreTimelineItems = visibleTimelineItems.length < timelineItems.length;
  const canSeeLessTimelineItems =
    timelineItems.length > ACTIVITY_TIMELINE_PAGE_SIZE &&
    visibleTimelineCount > ACTIVITY_TIMELINE_PAGE_SIZE;
  const ownerOptions = user
    ? [
        {
          id: user.id,
          fullName: user.fullName,
        },
      ]
    : [];

  if (!lead) {
    return (
      <EmptyState
        title={t('Lead not found')}
        description={t('The lead you requested is unavailable or may have been removed.')}
      />
    );
  }

  return (
    <Stack spacing={3} className="crm-lead-detail">
      <PageHeader
        eyebrow={t('Lead detail')}
        title={lead.title}
        description={t('Review contact information, stage, owner, and the customer message in one place.')}
        actions={
          <Box className="crm-leads-toolbar">
            <Button component={Link} to="/leads" variant="outlined">
              {t('Back to leads')}
            </Button>
            <Button onClick={() => setFormOpen(true)} variant="contained">
              {t('Edit lead')}
            </Button>
            <Button color="error" onClick={() => setConfirmOpen(true)} variant="outlined">
              {t('Delete')}
            </Button>
          </Box>
        }
      />

      {lead.isDuplicateWarning ? (
        <Alert severity="warning">
          {t('Duplicate warning detected for this lead. You can still continue working with it.')}
          {duplicateData.matchFields?.length
            ? ` ${t('Matched on')} ${duplicateData.matchFields.join(` ${t('and')} `)}.`
            : ''}
        </Alert>
      ) : null}

      <Box className="crm-lead-detail__summary">
        <Card className="crm-lead-detail__card">
          <CardContent className="crm-lead-detail__section">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip color="primary" label={lead.stageName} />
              <Chip variant="outlined" label={lead.status} />
              {lead.isDuplicateWarning ? (
                <Chip color="warning" label={t('Duplicate')} />
              ) : null}
            </Stack>
            <Box className="crm-lead-detail__fields">
              <Field label={t('Contact')} value={lead.contact?.fullName || lead.contactName} />
              <Field label={t('Email')} value={lead.contact?.email || lead.email} />
              <Field label={t('Phone')} value={lead.contact?.phone || lead.phone} />
              <Field label={t('Company')} value={lead.contact?.companyName} />
              <Field label={t('Source')} value={lead.source} />
              <Field label={t('Owner')} value={lead.ownerName} />
              <Field label={t('Estimated cost')} value={formatCurrency(lead.estimatedCost)} />
              <Field label={t('Service requested')} value={lead.serviceRequested} />
            </Box>
          </CardContent>
        </Card>

        <Card className="crm-lead-detail__card">
          <CardContent className="crm-lead-detail__section">
            <Typography variant="h6">{t('Lead summary')}</Typography>
            <Field label={t('Created')} value={formatDate(lead.createdAtUtc)} />
            <Field label={t('Updated')} value={formatDate(lead.updatedAtUtc)} />
            <Field label={t('Message')} value={lead.message} />
          </CardContent>
        </Card>
      </Box>

      <Card className="crm-stage-timer-card">
        <CardContent className="crm-stage-timer-card__content">
          <Typography variant="h6">{t('Stage timer')}</Typography>

          {stageTimerQuery.isLoading ? (
            <Typography className="crm-muted-text">{t('Loading stage timing...')}</Typography>
          ) : stageTimerQuery.isError ? (
            <Alert severity="warning">
              {normalizeApiError(stageTimerQuery.error).message}
            </Alert>
          ) : stageTimerQuery.data ? (
            <Box className="crm-stage-timer">
              <Box className="crm-stage-timer__current">
                <Field
                  label={t('Current stage name')}
                  value={stageTimerQuery.data.currentStageName}
                />
                <Field
                  label={t('Entered date')}
                  value={formatDate(stageTimerQuery.data.enteredAtUtc)}
                />
                <Field
                  label={t('Days in current stage')}
                  value={String(stageTimerQuery.data.daysInCurrentStage)}
                />
              </Box>

              <Box className="crm-stage-timer__history">
                <Typography variant="subtitle1">{t('Previous stages')}</Typography>
                {previousStages.length ? (
                  visiblePreviousStages.map((item) => (
                    <Box key={`${item.stageName}-${item.enteredAtUtc}`} className="crm-stage-timer__history-item">
                      <Typography variant="subtitle2">{item.stageName}</Typography>
                      <Typography className="crm-muted-text">
                        {formatDate(item.enteredAtUtc)} {t('to')} {formatDate(item.exitedAtUtc)}
                      </Typography>
                      <Typography>{item.durationDays} {t('day(s)')}</Typography>
                    </Box>
                  ))
                ) : (
                  <EmptyState
                    title={t('No previous stage history')}
                    description={t('This lead has not moved through any earlier stages yet.')}
                  />
                )}
                {previousStages.length ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {hasMorePreviousStages ? (
                      <Button
                        variant="text"
                        onClick={() =>
                          setVisiblePreviousStagesCount((currentCount) =>
                            Math.min(
                              currentCount + PREVIOUS_STAGES_PAGE_SIZE,
                              previousStages.length,
                            ),
                          )
                        }
                      >
                        {t('See more...')}
                      </Button>
                    ) : null}
                    {canSeeLessPreviousStages ? (
                      <Button
                        variant="text"
                        onClick={() =>
                          setVisiblePreviousStagesCount(PREVIOUS_STAGES_PAGE_SIZE)
                        }
                      >
                        {t('See less')}
                      </Button>
                    ) : null}
                  </Stack>
                ) : null}
              </Box>
            </Box>
          ) : (
            <EmptyState
              title={t('No stage timing available')}
              description={t('Timing data will appear here when the backend provides stage history.')}
            />
          )}
        </CardContent>
      </Card>

      <Box className="crm-lead-detail__split-panels">
        <Card className="crm-lead-detail__card">
          <CardContent className="crm-lead-detail__section">
            <Box className="crm-lead-detail__section-header">
              <Box>
                <Typography variant="h6">{t('Notes')}</Typography>
                <Typography className="crm-muted-text">
                  {t('Keep the latest customer context and handoff details in one place.')}
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => {
                  setEditingNote(null);
                  setNoteFormOpen(true);
                }}
              >
                {t('Add note')}
              </Button>
            </Box>

            {notesQuery.isLoading ? (
              <Typography className="crm-muted-text">{t('Loading notes...')}</Typography>
            ) : notesQuery.isError ? (
              <Alert severity="warning">{normalizeApiError(notesQuery.error).message}</Alert>
            ) : notesQuery.data?.length ? (
              <Box className="crm-notes-list">
                {notesQuery.data.map((note) => (
                  <Box key={note.id} className="crm-note-item">
                    <Box className="crm-note-item__header">
                      <Box>
                        <Typography variant="subtitle2">{note.createdByName}</Typography>
                        <Typography className="crm-muted-text">
                          {formatDate(note.updatedAtUtc)}
                        </Typography>
                      </Box>
                      <Box className="crm-note-item__actions">
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setEditingNote(note);
                            setNoteFormOpen(true);
                          }}
                        >
                          {t('Edit')}
                        </Button>
                        <Button
                          color="error"
                          variant="outlined"
                          onClick={() => setDeletingNote(note)}
                        >
                          {t('Delete')}
                        </Button>
                      </Box>
                    </Box>
                    <Typography>{note.content}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <EmptyState
                title={t('No notes yet')}
                description={t('Add the first note to capture context for the team.')}
              />
            )}
          </CardContent>
        </Card>

        <Card className="crm-lead-detail__card">
          <CardContent className="crm-lead-detail__section">
            <Typography variant="h6">{t('Duplicate warning details')}</Typography>
            {duplicatesQuery.isLoading ? (
              <Typography className="crm-muted-text">{t('Checking duplicate matches...')}</Typography>
            ) : duplicatesQuery.isError ? (
              <Alert severity="warning">{normalizeApiError(duplicatesQuery.error).message}</Alert>
            ) : duplicateData.matchedContacts?.length ||
              duplicateData.matchedLeads?.length ||
              duplicateData.matchFields?.length ? (
              <Box className="crm-duplicate-section">
                <Box className="crm-duplicate-section__chips">
                  {duplicateData.matchFields.map((field) => (
                    <Chip key={field} label={`${t('Matched on')} ${field}`} color="warning" />
                  ))}
                </Box>

                <Divider />

                <Box className="crm-duplicate-section__group">
                  <Typography variant="subtitle1">{t('Matched contacts')}</Typography>
                  {duplicateData.matchedContacts.length ? (
                    duplicateData.matchedContacts.map((contact) => (
                      <Box key={contact.id} className="crm-duplicate-item">
                        <Typography variant="subtitle2">{contact.fullName}</Typography>
                        <Typography className="crm-muted-text">{contact.email || '-'}</Typography>
                        <Typography className="crm-muted-text">{contact.phone || '-'}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography className="crm-muted-text">{t('No matched contacts.')}</Typography>
                  )}
                </Box>

                <Box className="crm-duplicate-section__group">
                  <Typography variant="subtitle1">{t('Matched leads')}</Typography>
                  {duplicateData.matchedLeads.length ? (
                    duplicateData.matchedLeads.map((matchedLead) => (
                      <Box key={matchedLead.id} className="crm-duplicate-item">
                        <Typography variant="subtitle2">{matchedLead.title}</Typography>
                        <Typography className="crm-muted-text">
                          {matchedLead.email || '-'}
                        </Typography>
                        <Typography className="crm-muted-text">
                          {matchedLead.phone || '-'}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography className="crm-muted-text">{t('No matched leads.')}</Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <EmptyState
                title={t('No duplicate details')}
                description={t('This lead currently has no duplicate matches to review.')}
              />
            )}
          </CardContent>
        </Card>
      </Box>

      <Card className="crm-lead-detail__card">
        <CardContent className="crm-lead-detail__section">
          <Box className="crm-lead-detail__section-header">
            <Box>
              <Typography variant="h6">{t('Related tasks')}</Typography>
              <Typography className="crm-muted-text">
                {t('Keep next steps tied to this lead so the owner always has a clear queue.')}
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => {
                setEditingTask({
                  leadId: lead.id,
                  contactId: lead.contact?.id || lead.contactId || '',
                  assignedUserId: lead.ownerUserId || user?.id || '',
                  priority: 'Medium',
                  status: 'Pending',
                });
                setTaskFormOpen(true);
              }}
            >
              {t('Add task')}
            </Button>
          </Box>

          {tasksQuery.isLoading ? (
            <Typography className="crm-muted-text">{t('Loading related tasks...')}</Typography>
          ) : tasksQuery.isError ? (
            <Alert severity="warning">{normalizeApiError(tasksQuery.error).message}</Alert>
          ) : tasksQuery.data?.items?.length ? (
            <Box className="crm-lead-detail__tasks">
              {tasksQuery.data.items.map((task) => (
                <Box key={task.id} className="crm-lead-detail__task-item">
                  <Box className="crm-lead-detail__task-header">
                    <Box>
                      <Typography variant="subtitle1">{task.title}</Typography>
                      <Typography className="crm-muted-text">
                        {t('Due')} {formatDate(task.dueDateUtc)}
                      </Typography>
                    </Box>
                    <Box className="crm-lead-detail__task-actions">
                      {!task.isCompleted ? (
                        <Button
                          variant="contained"
                          onClick={() => completeTaskMutation.mutate(task.id)}
                        >
                          {t('Complete')}
                        </Button>
                      ) : null}
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setEditingTask(task);
                          setTaskFormOpen(true);
                        }}
                      >
                        {t('Edit')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setDeletingTask(task)}
                      >
                        {t('Delete')}
                      </Button>
                    </Box>
                  </Box>
                  <Box className="crm-lead-detail__task-meta">
                    <Chip
                      label={task.priority}
                      color={task.priority === 'High' ? 'error' : 'default'}
                      variant={task.priority === 'High' ? 'filled' : 'outlined'}
                    />
                    <Chip
                      label={task.status}
                      color={task.isCompleted ? 'success' : 'primary'}
                      variant={task.isCompleted ? 'filled' : 'outlined'}
                    />
                    <Chip label={task.assignedUserName || t('Unassigned')} variant="outlined" />
                    {isOverdueTask(task) ? <Chip label={t('Overdue')} color="error" /> : null}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <EmptyState
              title={t('No tasks linked to this lead')}
              description={t('Create a task here to keep the next follow-up action visible.')}
            />
          )}
        </CardContent>
      </Card>

      <Card className="crm-lead-detail__card">
        <CardContent className="crm-lead-detail__section">
          <Typography variant="h6">{t('Activity timeline')}</Typography>

          {timelineQuery.isLoading ? (
            <Typography className="crm-muted-text">{t('Loading activity timeline...')}</Typography>
          ) : timelineQuery.isError ? (
            <Alert severity="warning">{normalizeApiError(timelineQuery.error).message}</Alert>
          ) : timelineItems.length ? (
            <Box className="crm-activity-list">
              {visibleTimelineItems.map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {hasMoreTimelineItems ? (
                  <Button
                    variant="text"
                    onClick={() =>
                      setVisibleTimelineCount((currentCount) =>
                        Math.min(currentCount + ACTIVITY_TIMELINE_PAGE_SIZE, timelineItems.length),
                      )
                    }
                  >
                    {t('See more...')}
                  </Button>
                ) : null}
                {canSeeLessTimelineItems ? (
                  <Button
                    variant="text"
                    onClick={() => setVisibleTimelineCount(ACTIVITY_TIMELINE_PAGE_SIZE)}
                  >
                    {t('See less')}
                  </Button>
                ) : null}
              </Stack>
            </Box>
          ) : (
            <EmptyState
              title={t('No activity recorded')}
              description={t('Timeline events will appear here as the lead changes over time.')}
            />
          )}
        </CardContent>
      </Card>

      <LeadFormDialog
        lead={lead}
        open={formOpen}
        ownerOptions={ownerOptions}
        serviceOptions={servicesQuery.data || []}
        sourceOptions={leadSourcesQuery.data || []}
        stageOptions={stagesQuery.data || []}
        statusOptions={['Open', 'Won', 'Lost', 'Archived']}
        onClose={() => setFormOpen(false)}
        onSubmit={(values) =>
          updateLeadMutation.mutateAsync({
            ...values,
            estimatedCost:
              values.estimatedCost === '' || values.estimatedCost === null
                ? null
                : Number(values.estimatedCost),
          })
        }
      />

      <NoteFormDialog
        open={noteFormOpen}
        note={editingNote}
        onClose={() => {
          setNoteFormOpen(false);
          setEditingNote(null);
        }}
        onSubmit={(values) => {
          if (editingNote) {
            return updateNoteMutation.mutateAsync({
              noteId: editingNote.id,
              payload: values,
            });
          }

          return createNoteMutation.mutateAsync(values);
        }}
      />

      <TaskFormDialog
        open={taskFormOpen}
        task={editingTask}
        leadOptions={[
          {
            id: lead.id,
            title: lead.title,
          },
        ]}
        contactOptions={contactsQuery.data?.items || []}
        assignedUserOptions={ownerOptions}
        priorityOptions={['High', 'Medium', 'Low']}
        statusOptions={['Pending', 'In Progress', 'Completed']}
        onClose={() => {
          setTaskFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={(values) => {
          const payload = {
            ...values,
            leadId: lead.id,
            contactId: values.contactId || lead.contact?.id || lead.contactId || null,
            dueDateUtc: values.dueDateUtc
              ? dayjs(values.dueDateUtc).endOf('day').toISOString()
              : null,
          };

          if (editingTask?.id) {
            return updateTaskMutation.mutateAsync({
              taskId: editingTask.id,
              payload,
            });
          }

          return createTaskMutation.mutateAsync(payload);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={t('Delete lead?')}
        description={t("This removes the lead from the CRM list. You can't undo this action.")}
        confirmLabel={t('Delete lead')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => deleteLeadMutation.mutate()}
      />

      <ConfirmDialog
        open={Boolean(deletingNote)}
        title={t('Delete note?')}
        description={t('This removes the note from the lead history.')}
        confirmLabel={t('Delete note')}
        onCancel={() => setDeletingNote(null)}
        onConfirm={() => deleteNoteMutation.mutate(deletingNote.id)}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        title={t('Delete task?')}
        description={t('This removes the task from the lead work queue.')}
        confirmLabel={t('Delete task')}
        onCancel={() => setDeletingTask(null)}
        onConfirm={() => deleteTaskMutation.mutate(deletingTask.id)}
      />
    </Stack>
  );
}

export default LeadDetailPage;
