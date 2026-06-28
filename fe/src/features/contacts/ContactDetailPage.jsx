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
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  deleteContact,
  getContactById,
  updateContact,
} from '../../api/contactsApi.js';
import { getLeads } from '../../api/leadsApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import { getTasks } from '../../api/tasksApi.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ConfirmDialog from '../../shared/components/feedback/ConfirmDialog.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import useAuth from '../../shared/hooks/useAuth.js';
import ContactFormDialog from './ContactFormDialog.jsx';
import './contacts.css';
import { useState } from 'react';

function ContactField({ label, value }) {
  return (
    <Box className="crm-contact-field">
      <Typography className="crm-contact-field__label">{label}</Typography>
      <Typography className="crm-contact-field__value">{value || '-'}</Typography>
    </Box>
  );
}

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY h:mm A') : '-';
}

function isTaskDone(task) {
  return task.isCompleted || task.status === 'Done' || task.status === 'Completed';
}

function isTaskOverdue(task) {
  return !isTaskDone(task) && task.dueDateUtc && dayjs(task.dueDateUtc).isBefore(dayjs());
}

function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const userPermissions = new Set(user?.permissions || []);
  const canEditContact = userPermissions.has('contacts.edit');
  const canDeleteContact = userPermissions.has('contacts.delete');

  const contactQuery = useQuery({
    queryKey: ['contact', id],
    queryFn: () => getContactById(id),
    enabled: Boolean(id),
  });
  const relatedLeadsQuery = useQuery({
    queryKey: ['leads', { contactId: id, page: 1, pageSize: 25 }],
    queryFn: () => getLeads({ contactId: id, page: 1, pageSize: 25 }),
    enabled: Boolean(id),
  });
  const relatedTasksQuery = useQuery({
    queryKey: ['tasks', { contactId: id, page: 1, pageSize: 25 }],
    queryFn: () => getTasks({ contactId: id, page: 1, pageSize: 25 }),
    enabled: Boolean(id),
  });

  const updateContactMutation = useMutation({
    mutationFn: (payload) => updateContact(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      showNotification({
        severity: 'success',
        message: t('Contact updated successfully.'),
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

  const deleteContactMutation = useMutation({
    mutationFn: () => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      showNotification({
        severity: 'success',
        message: t('Contact deleted successfully.'),
      });
      navigate('/contacts');
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  if (contactQuery.isLoading) {
    return <LoadingState />;
  }

  if (contactQuery.isError) {
    return (
      <ErrorState
        title={t('Unable to load contact details.')}
        description={normalizeApiError(contactQuery.error).message}
        onRetry={() => contactQuery.refetch()}
      />
    );
  }

  const contact = contactQuery.data;
  const relatedLeads = relatedLeadsQuery.data?.items || [];
  const relatedTasks = relatedTasksQuery.data?.items || [];

  if (!contact) {
    return (
      <EmptyState
        title={t('Contact not found')}
        description={t('The contact you requested is unavailable or may have been removed.')}
      />
    );
  }

  return (
    <Stack spacing={3} className="crm-contact-detail">
      <PageHeader
        eyebrow={t('Contact detail')}
        title={contact.fullName}
        description={t('Review contact details, linked leads, and follow-up work in one place.')}
        actions={
          <Box className="crm-contact-detail__actions">
            <Button component={Link} to="/contacts" variant="outlined">
              {t('Back to contacts')}
            </Button>
            {canEditContact ? (
              <Button onClick={() => setFormOpen(true)} variant="contained">
                {t('Edit contact')}
              </Button>
            ) : null}
            {canDeleteContact ? (
              <Button color="error" onClick={() => setConfirmOpen(true)} variant="outlined">
                {t('Delete')}
              </Button>
            ) : null}
          </Box>
        }
      />

      <Box className="crm-contact-detail__summary">
        <Card className="crm-card crm-contact-detail__card">
          <CardContent className="crm-contact-detail__section">
            <Typography variant="h6">{t('Contact information')}</Typography>
            <Box className="crm-contact-detail__fields">
              <ContactField label={t('Salutation')} value={contact.salutation} />
              <ContactField label={t('Full name')} value={contact.fullName} />
              <ContactField label={t('Company')} value={contact.companyName} />
              <ContactField label={t('Created')} value={formatDate(contact.createdAtUtc)} />
            </Box>
          </CardContent>
        </Card>

        <Card className="crm-card crm-contact-detail__card">
          <CardContent className="crm-contact-detail__section">
            <Typography variant="h6">{t('Communication')}</Typography>
            <Box className="crm-contact-detail__fields crm-contact-detail__fields--single">
              <ContactField label={t('Email')} value={contact.email} />
              <ContactField label={t('Phone')} value={contact.phone} />
              <ContactField label={t('Updated')} value={formatDate(contact.updatedAtUtc)} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box className="crm-contact-detail__relationships">
        <Card className="crm-card crm-contact-detail__card">
          <CardContent className="crm-contact-detail__section">
            <Box className="crm-contact-detail__section-header">
              <Box>
                <Typography variant="h6">{t('Related leads')}</Typography>
                <Typography className="crm-muted-text">
                  {t('Active leads connected to this contact.')}
                </Typography>
              </Box>
            </Box>

            {relatedLeadsQuery.isLoading ? (
              <Typography className="crm-muted-text">{t('Loading related leads...')}</Typography>
            ) : relatedLeadsQuery.isError ? (
              <Typography className="crm-muted-text">
                {normalizeApiError(relatedLeadsQuery.error).message}
              </Typography>
            ) : relatedLeads.length ? (
              <Box className="crm-contact-related-list">
                {relatedLeads.map((lead) => (
                  <Box key={lead.id} className="crm-contact-related-item">
                    <Box>
                      <Button
                        className="crm-contact-related-item__title"
                        component={Link}
                        to={`/leads/${lead.id}`}
                        variant="text"
                      >
                        {lead.title}
                      </Button>
                      <Typography className="crm-muted-text">
                        {lead.stageName || '-'} - {formatDate(lead.createdAtUtc)}
                      </Typography>
                    </Box>
                    <Box className="crm-contact-related-item__chips">
                      <Chip label={lead.status || t('Open')} size="small" variant="outlined" />
                      {lead.serviceRequested ? (
                        <Chip label={lead.serviceRequested} size="small" variant="outlined" />
                      ) : null}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <EmptyState
                title={t('No leads linked')}
                description={t('Leads linked to this contact will appear here.')}
              />
            )}
          </CardContent>
        </Card>

        <Card className="crm-card crm-contact-detail__card">
          <CardContent className="crm-contact-detail__section">
            <Box className="crm-contact-detail__section-header">
              <Box>
                <Typography variant="h6">{t('Related tasks')}</Typography>
                <Typography className="crm-muted-text">
                  {t('Follow-up work tied directly to this contact.')}
                </Typography>
              </Box>
              <Button component={Link} to={`/tasks?contactId=${contact.id}`} variant="outlined">
                {t('View tasks')}
              </Button>
            </Box>

            {relatedTasksQuery.isLoading ? (
              <Typography className="crm-muted-text">{t('Loading related tasks...')}</Typography>
            ) : relatedTasksQuery.isError ? (
              <Typography className="crm-muted-text">
                {normalizeApiError(relatedTasksQuery.error).message}
              </Typography>
            ) : relatedTasks.length ? (
              <Box className="crm-contact-related-list">
                {relatedTasks.map((task) => (
                  <Box key={task.id} className="crm-contact-related-item">
                    <Box>
                      <Typography variant="subtitle1">{task.title}</Typography>
                      <Typography className="crm-muted-text">
                        {t('Due')} {formatDate(task.dueDateUtc)}
                      </Typography>
                    </Box>
                    <Box className="crm-contact-related-item__chips">
                      <Chip
                        color={
                          isTaskOverdue(task) ? 'error' : isTaskDone(task) ? 'success' : 'primary'
                        }
                        label={isTaskOverdue(task) ? t('Overdue') : task.status}
                        size="small"
                        variant={isTaskDone(task) || isTaskOverdue(task) ? 'filled' : 'outlined'}
                      />
                      <Chip label={task.priority} size="small" variant="outlined" />
                      {task.leadId ? (
                        <Button component={Link} to={`/leads/${task.leadId}`} variant="text">
                          {t('Open lead')}
                        </Button>
                      ) : null}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <EmptyState
                title={t('No tasks linked')}
                description={t('Tasks linked to this contact will appear here.')}
              />
            )}
          </CardContent>
        </Card>
      </Box>

      <ContactFormDialog
        open={formOpen}
        contact={contact}
        onClose={() => setFormOpen(false)}
        onSubmit={(values) => updateContactMutation.mutateAsync(values)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={t('Delete contact?')}
        description={t("This removes the contact from the CRM list. You can't undo this action.")}
        confirmLabel={t('Delete contact')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => deleteContactMutation.mutate()}
      />
    </Stack>
  );
}

export default ContactDetailPage;
