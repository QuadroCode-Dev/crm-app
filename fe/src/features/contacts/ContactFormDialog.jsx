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

const salutationOptions = [
  '',
  'Mr.',
  'Mrs.',
  'Ms.',
  'Miss',
  'Dr.',
  'Prof.',
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sanitizeFullName(value) {
  return String(value || '').replace(/[^\p{L}\s]/gu, '');
}

function sanitizePhone(value) {
  const sanitized = String(value || '').replace(/[^\d+]/g, '');
  return `${sanitized.startsWith('+') ? '+' : ''}${sanitized.replace(/\+/g, '')}`;
}

function createContactSchema(t) {
  return yup.object({
    fullName: yup
      .string()
      .trim()
      .required(t('Full name is required.'))
      .matches(/^[\p{L}\s]+$/u, t('Full name can contain letters and spaces only.')),
    salutation: yup.string().trim().nullable(),
    email: yup
      .string()
      .trim()
      .nullable()
      .transform((value) => (value === '' ? null : value))
      .email(t('Enter a valid email address.'))
      .matches(emailPattern, {
        message: t('Enter a valid email address.'),
        excludeEmptyString: true,
      }),
    phone: yup
      .string()
      .trim()
      .nullable()
      .test(
        'valid-contact-phone',
        t('Phone can contain numbers and an optional leading + only.'),
        (value) => !value || /^\+?\d+$/.test(value),
      ),
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
      salutation: '',
      fullName: '',
      email: '',
      phone: '',
      companyName: '',
    },
    resolver: yupResolver(createContactSchema(t)),
  });

  useEffect(() => {
    reset({
      salutation: contact?.salutation || '',
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
            name="salutation"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
                label={t('Salutation')}
              >
                {salutationOptions.map((option) => (
                  <option key={option || 'none'} value={option}>
                    {option ? t(option) : t('Select salutation')}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Full name')}
                onChange={(event) => field.onChange(sanitizeFullName(event.target.value))}
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
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Phone')}
                inputProps={{ inputMode: 'tel' }}
                onChange={(event) => field.onChange(sanitizePhone(event.target.value))}
                error={Boolean(errors.phone)}
                helperText={errors.phone?.message}
              />
            )}
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
