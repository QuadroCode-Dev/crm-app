import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  createService,
  deleteService,
  getAllServices,
  updateService,
} from '../../api/servicesApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import PageHeader from '../../shared/components/PageHeader.jsx';
import ConfirmDialog from '../../shared/components/feedback/ConfirmDialog.jsx';
import EmptyState from '../../shared/components/feedback/EmptyState.jsx';
import ErrorState from '../../shared/components/feedback/ErrorState.jsx';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import useLanguage from '../../shared/hooks/useLanguage.js';
import useNotifications from '../../shared/hooks/useNotifications.js';
import './services.css';

const emptyForm = {
  name: '',
  estimatedCost: '',
  isActive: true,
};

function formatCost(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function ServiceFormDialog({ open, service, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues({
      name: service?.name || '',
      estimatedCost: service?.estimatedCost ?? '',
      isActive: service?.isActive ?? true,
    });
    setErrors({});
  }, [service, open]);

  function updateField(name, value) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
    setErrors((current) => ({
      ...current,
      [name]: '',
    }));
  }

  function validate() {
    const nextErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = t('Service name is required.');
    }

    if (values.estimatedCost !== '' && Number(values.estimatedCost) < 0) {
      nextErrors.estimatedCost = t('Estimated cost cannot be negative.');
    }

    if (values.estimatedCost !== '' && Number.isNaN(Number(values.estimatedCost))) {
      nextErrors.estimatedCost = t('Estimated cost must be a number.');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) {
      return;
    }

    onSubmit({
      name: values.name.trim(),
      estimatedCost: values.estimatedCost === '' ? null : Number(values.estimatedCost),
      isActive: values.isActive,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{service ? t('Edit service') : t('Create service')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('Service name')}
            value={values.name}
            onChange={(event) => updateField('name', event.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            fullWidth
          />
          <TextField
            label={t('Estimated cost')}
            value={values.estimatedCost}
            onChange={(event) => updateField('estimatedCost', event.target.value)}
            error={Boolean(errors.estimatedCost)}
            helperText={errors.estimatedCost || t('Leave blank when no estimate is available.')}
            fullWidth
            type="number"
            inputProps={{ min: 0, step: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={values.isActive}
                onChange={(event) => updateField('isActive', event.target.checked)}
              />
            }
            label={t('Active service')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained">
          {service ? t('Save service') : t('Create service')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SettingsServicesPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { showNotification } = useNotifications();
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deletingService, setDeletingService] = useState(null);

  const servicesQuery = useQuery({
    queryKey: ['services', 'all'],
    queryFn: getAllServices,
  });

  const invalidateServices = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    queryClient.invalidateQueries({ queryKey: ['public-services'] });
  };

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      invalidateServices();
      setFormOpen(false);
      showNotification({ severity: 'success', message: t('Service created successfully.') });
    },
    onError: (error) => {
      showNotification({ severity: 'error', message: normalizeApiError(error).message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateService(id, payload),
    onSuccess: () => {
      invalidateServices();
      setEditingService(null);
      setFormOpen(false);
      showNotification({ severity: 'success', message: t('Service updated successfully.') });
    },
    onError: (error) => {
      showNotification({ severity: 'error', message: normalizeApiError(error).message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      invalidateServices();
      setDeletingService(null);
      showNotification({ severity: 'success', message: t('Service deleted successfully.') });
    },
    onError: (error) => {
      showNotification({ severity: 'error', message: normalizeApiError(error).message });
    },
  });

  function handleSubmit(payload) {
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, payload });
      return;
    }

    createMutation.mutate(payload);
  }

  if (servicesQuery.isLoading && !servicesQuery.data) {
    return <LoadingState />;
  }

  if (servicesQuery.isError) {
    return (
      <ErrorState
        title={t('Unable to load services.')}
        description={normalizeApiError(servicesQuery.error).message}
        onRetry={() => servicesQuery.refetch()}
      />
    );
  }

  const services = servicesQuery.data || [];

  return (
    <Stack spacing={3} className="crm-services-settings-page">
      <PageHeader
        eyebrow={t('Settings')}
        title={t('Services')}
        description={t('Manage the services offered by the company and optional estimated costs used by lead capture forms.')}
        actions={
          <Button
            variant="contained"
            onClick={() => {
              setEditingService(null);
              setFormOpen(true);
            }}
          >
            {t('Add service')}
          </Button>
        }
      />

      {services.length === 0 ? (
        <EmptyState
          title={t('No services configured')}
          description={t('Add services so public lead forms can show a controlled list.')}
        />
      ) : (
        <Box className="crm-services-settings-list">
          {services.map((service) => (
            <Card key={service.id} className="crm-services-settings-card">
              <CardContent className="crm-services-settings-card__content">
                <Box>
                  <Typography variant="h6">{service.name}</Typography>
                  <Typography className="crm-muted-text">{service.code}</Typography>
                </Box>
                <Box className="crm-services-settings-card__meta">
                  <Typography>{formatCost(service.estimatedCost)}</Typography>
                  <Chip
                    color={service.isActive ? 'success' : 'default'}
                    label={service.isActive ? t('Active') : t('Inactive')}
                    size="small"
                  />
                </Box>
                <Box className="crm-services-settings-card__actions">
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditingService(service);
                      setFormOpen(true);
                    }}
                  >
                    {t('Edit')}
                  </Button>
                  <Button color="error" variant="outlined" onClick={() => setDeletingService(service)}>
                    {t('Delete')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <ServiceFormDialog
        open={formOpen}
        service={editingService}
        onClose={() => {
          setFormOpen(false);
          setEditingService(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deletingService)}
        title={t('Delete service?')}
        description={t('This removes the service from public lead capture choices.')}
        confirmLabel={t('Delete service')}
        onCancel={() => setDeletingService(null)}
        onConfirm={() => deleteMutation.mutate(deletingService.id)}
      />
    </Stack>
  );
}

export default SettingsServicesPage;
