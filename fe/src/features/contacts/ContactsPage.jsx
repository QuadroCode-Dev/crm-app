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
import { Link } from 'react-router-dom';
import {
  createContact,
  deleteContact,
  getContacts,
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
  return value ? dayjs(value).format('MMM D, YYYY') : '-';
}

function ContactsPage() {
  const queryClient = useQueryClient();
  const { showNotification } = useNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deletingContact, setDeletingContact] = useState(null);

  const contactsQuery = useQuery({
    queryKey: ['contacts', { page: 1, pageSize: 100 }],
    queryFn: () => getContacts({ page: 1, pageSize: 100 }),
  });

  const createContactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      showNotification({
        severity: 'success',
        message: 'Contact created successfully.',
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

  const updateContactMutation = useMutation({
    mutationFn: ({ id, payload }) => updateContact(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.id] });
      showNotification({
        severity: 'success',
        message: 'Contact updated successfully.',
      });
      setFormOpen(false);
      setEditingContact(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      showNotification({
        severity: 'success',
        message: 'Contact deleted successfully.',
      });
      setDeletingContact(null);
    },
    onError: (error) => {
      showNotification({
        severity: 'error',
        message: normalizeApiError(error).message,
      });
    },
  });

  function handleCreate() {
    setEditingContact(null);
    setFormOpen(true);
  }

  function handleEdit(contact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  function handleSubmit(values) {
    if (editingContact) {
      return updateContactMutation.mutateAsync({
        id: editingContact.id,
        payload: values,
      });
    }

    return createContactMutation.mutateAsync(values);
  }

  if (contactsQuery.isLoading) {
    return <LoadingState />;
  }

  if (contactsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load contacts."
        description={normalizeApiError(contactsQuery.error).message}
        onRetry={() => contactsQuery.refetch()}
      />
    );
  }

  const contacts = contactsQuery.data?.items || [];

  return (
    <Stack spacing={3} className="crm-contacts-page">
      <PageHeader
        eyebrow="People and companies"
        title="Contacts"
        description="Manage the people behind your leads and keep core contact details clean."
        actions={
          <Button onClick={handleCreate} variant="contained">
            Add contact
          </Button>
        }
      />

      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Create your first contact to start linking people and companies to leads."
          actionLabel="Create contact"
          onAction={handleCreate}
        />
      ) : (
        <Box className="crm-contacts-list">
          {contacts.map((contact) => (
            <Card key={contact.id} className="crm-card">
              <CardContent className="crm-contact-card__content">
                <Box className="crm-contact-card__header">
                  <Box>
                    <Typography variant="h6">{contact.fullName}</Typography>
                    <Typography className="crm-muted-text">
                      Updated {formatDate(contact.updatedAtUtc)}
                    </Typography>
                  </Box>
                  <Box className="crm-contact-card__actions">
                    <Button component={Link} to={`/contacts/${contact.id}`} variant="outlined">
                      Open
                    </Button>
                    <Button onClick={() => handleEdit(contact)} variant="outlined">
                      Edit
                    </Button>
                    <Button
                      color="error"
                      onClick={() => setDeletingContact(contact)}
                      variant="outlined"
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
                <Box className="crm-contact-card__fields">
                  <ContactField label="Email" value={contact.email} />
                  <ContactField label="Phone" value={contact.phone} />
                  <ContactField label="Company" value={contact.companyName} />
                  <ContactField label="Created" value={formatDate(contact.createdAtUtc)} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <ContactFormDialog
        open={formOpen}
        contact={editingContact}
        onClose={() => {
          setFormOpen(false);
          setEditingContact(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingContact)}
        title="Delete contact?"
        description="This removes the contact from the CRM list. You can’t undo this action."
        confirmLabel="Delete contact"
        onCancel={() => setDeletingContact(null)}
        onConfirm={() => deleteContactMutation.mutate(deletingContact.id)}
      />
    </Stack>
  );
}

export default ContactsPage;
