import {
  Box,
  Button,
  Card,
  CardContent,
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
import { normalizeApiError } from '../../api/normalizeApiError.js';
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
        description={t('Keep contact information current before tying it into new or existing leads.')}
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

      <Card className="crm-card">
        <CardContent className="crm-contact-detail__card-content">
          <Typography className="crm-muted-text">
            {t('Created')} {formatDate(contact.createdAtUtc)} {t('and last updated')} {formatDate(contact.updatedAtUtc)}.
          </Typography>
          <Box className="crm-contact-detail__fields">
            <ContactField label={t('Email')} value={contact.email} />
            <ContactField label={t('Phone')} value={contact.phone} />
            <ContactField label={t('Company')} value={contact.companyName} />
            <ContactField label={t('Contact ID')} value={contact.id} />
          </Box>
        </CardContent>
      </Card>

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
