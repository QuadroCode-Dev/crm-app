import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import * as yup from 'yup';
import useLanguage from '../../shared/hooks/useLanguage.js';

function createLeadSchema(t) {
  return yup.object({
    title: yup.string().trim().required(t('Title is required.')),
    contactId: yup.string().required(t('Contact is required.')),
    source: yup.string().trim().required(t('Source is required.')),
    stageId: yup.string().required(t('Pipeline stage is required.')),
    ownerUserId: yup.string().required(t('Owner is required.')),
    status: yup.string().trim().required(t('Status is required.')),
    estimatedCost: yup
      .number()
      .transform((value, originalValue) => (originalValue === '' ? null : value))
      .nullable()
      .typeError(t('Estimated cost must be a number.')),
    serviceRequested: yup.string().trim().nullable(),
    message: yup.string().trim().nullable(),
  });
}

function LeadFormDialog({
  contacts,
  lead,
  open,
  ownerOptions,
  sourceOptions,
  stageOptions,
  statusOptions,
  onClose,
  onSubmit,
}) {
  const { t } = useLanguage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: '',
      contactId: '',
      source: '',
      stageId: '',
      ownerUserId: '',
      status: '',
      estimatedCost: '',
      serviceRequested: '',
      message: '',
    },
    resolver: yupResolver(createLeadSchema(t)),
  });

  useEffect(() => {
    reset({
      title: lead?.title || '',
      contactId: lead?.contactId || '',
      source: lead?.sourceId || lead?.leadSourceId || lead?.source || '',
      stageId: lead?.stageId || '',
      ownerUserId: lead?.ownerUserId || '',
      status: lead?.status || '',
      estimatedCost: lead?.estimatedCost ?? '',
      serviceRequested: lead?.serviceRequested || '',
      message: lead?.message || '',
    });
  }, [lead, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{lead ? t('Edit lead') : t('Create lead')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Title')}
                error={Boolean(errors.title)}
                helperText={errors.title?.message}
              />
            )}
          />
          <Controller
            name="contactId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label={t('Contact')}
                error={Boolean(errors.contactId)}
                helperText={errors.contactId?.message}
              >
                <option value="">{t('Select a contact')}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.fullName}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="source"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label={t('Source')}
                error={Boolean(errors.source)}
                helperText={errors.source?.message}
              >
                <option value="">{t('Select a source')}</option>
                {sourceOptions.map((option) => (
                  <option key={option.id || option} value={option.id || option}>
                    {option.name || option}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="stageId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label={t('Pipeline stage')}
                error={Boolean(errors.stageId)}
                helperText={errors.stageId?.message}
              >
                <option value="">{t('Select a stage')}</option>
                {stageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="ownerUserId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label={t('Owner')}
                error={Boolean(errors.ownerUserId)}
                helperText={errors.ownerUserId?.message}
              >
                <option value="">{t('Select an owner')}</option>
                {ownerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullName}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label={t('Status')}
                error={Boolean(errors.status)}
                helperText={errors.status?.message}
              >
                <option value="">{t('Select a status')}</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {t(option)}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="estimatedCost"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Estimated cost')}
                error={Boolean(errors.estimatedCost)}
                helperText={errors.estimatedCost?.message}
              />
            )}
          />
          <Controller
            name="serviceRequested"
            control={control}
            render={({ field }) => <TextField {...field} label={t('Service requested')} />}
          />
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <TextField {...field} label={t('Message')} multiline minRows={3} />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? t('Saving...') : lead ? t('Save lead') : t('Create lead')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LeadFormDialog;
