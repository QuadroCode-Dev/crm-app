import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link, useSearchParams } from 'react-router-dom';
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
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import useAuth from '../../shared/hooks/useAuth.js';
import ContactFormDialog from './ContactFormDialog.jsx';
import './contacts.css';
import { useMemo, useState } from 'react';

function renderCompactCell(value) {
  return (
    <Tooltip title={value || ''}>
      <span className="crm-contacts-table__cell-text">{value || '-'}</span>
    </Tooltip>
  );
}

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY') : '-';
}

function ContactsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deletingContact, setDeletingContact] = useState(null);
  const userPermissions = new Set(user?.permissions || []);
  const canCreateContact = userPermissions.has('contacts.create');
  const canEditContact = userPermissions.has('contacts.edit');
  const canDeleteContact = userPermissions.has('contacts.delete');
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('pageSize') || '10');
  const query = {
    page,
    pageSize,
    search: searchParams.get('search') || '',
  };

  const contactsQuery = useQuery({
    queryKey: ['contacts', query],
    queryFn: () => getContacts(query),
    placeholderData: (previousData) => previousData,
  });

  const createContactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      showNotification({
        severity: 'success',
        message: t('Contact created successfully.'),
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
        message: t('Contact updated successfully.'),
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
        message: t('Contact deleted successfully.'),
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

  function updateFilters(nextValues) {
    const updated = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        updated.delete(key);
      } else {
        updated.set(key, String(value));
      }
    });

    if (nextValues.search !== undefined) {
      updated.set('page', '1');
    }

    if (!updated.get('pageSize')) {
      updated.set('pageSize', String(pageSize));
    }

    setSearchParams(updated);
  }

  const columns = useMemo(
    () => [
      {
        field: 'fullName',
        headerName: t('Name'),
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Button
            className="crm-contacts-table__name-link"
            component={Link}
            to={`/contacts/${params.row.id}`}
            variant="text"
          >
            {params.value}
          </Button>
        ),
      },
      {
        field: 'companyName',
        headerName: t('Company'),
        flex: 0.95,
        minWidth: 170,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'email',
        headerName: t('Email'),
        flex: 1.15,
        minWidth: 210,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'phone',
        headerName: t('Phone'),
        flex: 0.8,
        minWidth: 140,
        renderCell: (params) => renderCompactCell(params.value),
      },
      {
        field: 'updatedAtUtc',
        headerName: t('Updated'),
        flex: 0.75,
        minWidth: 130,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'createdAtUtc',
        headerName: t('Created'),
        flex: 0.75,
        minWidth: 130,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        flex: 0.55,
        minWidth: 120,
        sortable: false,
        filterable: false,
        hideable: false,
        renderCell: (params) => (
          <Stack className="crm-contacts-table__actions" direction="row" spacing={0.5}>
            <Tooltip title={t('Open')}>
              <IconButton
                aria-label={t('Open')}
                color="primary"
                component={Link}
                to={`/contacts/${params.row.id}`}
                size="small"
              >
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canEditContact ? (
              <Tooltip title={t('Edit')}>
                <IconButton
                  aria-label={t('Edit')}
                  color="primary"
                  onClick={() => handleEdit(params.row)}
                  size="small"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {canDeleteContact ? (
              <Tooltip title={t('Delete')}>
                <IconButton
                  aria-label={t('Delete')}
                  color="error"
                  onClick={() => setDeletingContact(params.row)}
                  size="small"
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        ),
      },
    ],
    [canDeleteContact, canEditContact, t],
  );

  if (contactsQuery.isLoading && !contactsQuery.data) {
    return <LoadingState />;
  }

  if (contactsQuery.isError) {
    return (
      <ErrorState
        title={t('Unable to load contacts.')}
        description={normalizeApiError(contactsQuery.error).message}
        onRetry={() => contactsQuery.refetch()}
      />
    );
  }

  const contacts = contactsQuery.data?.items || [];
  const hasFilters = Boolean(query.search);

  return (
    <Stack spacing={3} className="crm-contacts-page">
      <PageHeader
        eyebrow={t('People and companies')}
        title={t('Contacts')}
        description={t('Manage the people behind your leads and keep core contact details clean.')}
        actions={
          canCreateContact ? (
            <Button onClick={handleCreate} variant="contained">
              {t('Add contact')}
            </Button>
          ) : null
        }
      />

      {contacts.length || hasFilters ? (
        <Card className="crm-card crm-contacts-filters-card">
          <CardContent>
            <Box className="crm-contacts-filters">
              <TextField
                label={t('Search')}
                value={query.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder={t('Name, email, or phone')}
                className="crm-contacts-filters__search"
              />
              <Box className="crm-contacts-filters__actions">
                <Button
                  variant="outlined"
                  onClick={() =>
                    setSearchParams({
                      page: '1',
                      pageSize: String(pageSize),
                    })
                  }
                >
                  {t('Reset')}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {contacts.length === 0 ? (
        <EmptyState
          title={hasFilters ? t('No contacts match this search') : t('No contacts yet')}
          description={
            hasFilters
              ? t('Try a different name, email, or phone number.')
              : t('Create your first contact to start linking people and companies to leads.')
          }
          actionLabel={!hasFilters && canCreateContact ? t('Create contact') : undefined}
          onAction={!hasFilters && canCreateContact ? handleCreate : undefined}
        />
      ) : (
        <Card className="crm-card crm-contacts-table-card">
          <CardContent>
            <Box className="crm-contacts-table">
              <DataGrid
                autoHeight
                columns={columns}
                columnHeaderHeight={44}
                disableColumnMenu
                disableRowSelectionOnClick
                disableVirtualization
                loading={contactsQuery.isFetching}
                pageSizeOptions={[5, 10, 25]}
                pagination
                paginationMode="server"
                paginationModel={{
                  page: page - 1,
                  pageSize,
                }}
                rowCount={contactsQuery.data?.totalCount || 0}
                rows={contacts}
                rowHeight={44}
                onPaginationModelChange={(model) =>
                  updateFilters({
                    page: model.page + 1,
                    pageSize: model.pageSize,
                  })
                }
              />
            </Box>
          </CardContent>
        </Card>
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
        title={t('Delete contact?')}
        description={t("This removes the contact from the CRM list. You can't undo this action.")}
        confirmLabel={t('Delete contact')}
        onCancel={() => setDeletingContact(null)}
        onConfirm={() => deleteContactMutation.mutate(deletingContact.id)}
      />
    </Stack>
  );
}

export default ContactsPage;
