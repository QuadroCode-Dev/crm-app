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

function createContactSchema(t) {
  return yup.object({
    fullName: yup.string().trim().required(t('Full name is required.')),
    email: yup
      .string()
      .trim()
      .nullable()
      .transform((value) => (value === '' ? null : value))
      .email(t('Enter a valid email address.')),
    phone: yup.string().trim().nullable(),
    companyName: yup.string().trim().nullable(),
  });
}

function ContactFormDialog({ open, contact, onClose, onSubmit }) {
  const { t } = useLanguage();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      companyName: '',
    },
    resolver: yupResolver(createContactSchema(t)),
  });

  useEffect(() => {
    reset({
      fullName: contact?.fullName || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      companyName: contact?.companyName || '',
    });
  }, [contact, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{contact ? t('Edit contact') : t('Create contact')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Full name')}
                error={Boolean(errors.fullName)}
                helperText={errors.fullName?.message}
              />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Email')}
                type="email"
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => <TextField {...field} label={t('Phone')} />}
          />
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => <TextField {...field} label={t('Company name')} />}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? t('Saving...') : contact ? t('Save contact') : t('Create contact')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ContactFormDialog;
