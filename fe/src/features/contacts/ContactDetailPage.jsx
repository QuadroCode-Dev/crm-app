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
import useNotifications from '../../shared/hooks/useNotifications.js';
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
  const { showNotification } = useNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        message: 'Contact updated successfully.',
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
        message: 'Contact deleted successfully.',
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
        title="Unable to load contact details."
        description={normalizeApiError(contactQuery.error).message}
        onRetry={() => contactQuery.refetch()}
      />
    );
  }

  const contact = contactQuery.data;

  if (!contact) {
    return (
      <EmptyState
        title="Contact not found"
        description="The contact you requested is unavailable or may have been removed."
      />
    );
  }

  return (
    <Stack spacing={3} className="crm-contact-detail">
      <PageHeader
        eyebrow="Contact detail"
        title={contact.fullName}
        description="Keep contact information current before tying it into new or existing leads."
        actions={
          <Box className="crm-contact-detail__actions">
            <Button component={Link} to="/contacts" variant="outlined">
              Back to contacts
            </Button>
            <Button onClick={() => setFormOpen(true)} variant="contained">
              Edit contact
            </Button>
            <Button color="error" onClick={() => setConfirmOpen(true)} variant="outlined">
              Delete
            </Button>
          </Box>
        }
      />

      <Card className="crm-card">
        <CardContent className="crm-contact-detail__card-content">
          <Typography className="crm-muted-text">
            Created {formatDate(contact.createdAtUtc)} and last updated {formatDate(contact.updatedAtUtc)}.
          </Typography>
          <Box className="crm-contact-detail__fields">
            <ContactField label="Email" value={contact.email} />
            <ContactField label="Phone" value={contact.phone} />
            <ContactField label="Company" value={contact.companyName} />
            <ContactField label="Contact ID" value={contact.id} />
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
        title="Delete contact?"
        description="This removes the contact from the CRM list. You can’t undo this action."
        confirmLabel="Delete contact"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => deleteContactMutation.mutate()}
      />
    </Stack>
  );
}

export default ContactDetailPage;
