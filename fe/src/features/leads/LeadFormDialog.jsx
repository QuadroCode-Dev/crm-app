import {
  Button,
  Box,
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
  'Miss',
  'Dr.',
];

const phonePrefixOptions = [
  { code: 'LB', label: 'Lebanon', prefix: '+961' },
  { code: 'US', label: 'United States', prefix: '+1' },
  { code: 'GB', label: 'United Kingdom', prefix: '+44' },
  { code: 'TR', label: 'Turkey', prefix: '+90' },
  { code: 'AE', label: 'United Arab Emirates', prefix: '+971' },
  { code: 'SA', label: 'Saudi Arabia', prefix: '+966' },
  { code: 'QA', label: 'Qatar', prefix: '+974' },
  { code: 'KW', label: 'Kuwait', prefix: '+965' },
  { code: 'FR', label: 'France', prefix: '+33' },
  { code: 'DE', label: 'Germany', prefix: '+49' },
];

function sanitizePhoneNumber(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

function parseInternationalPhone(value, fallbackPrefix = '+961') {
  const sanitized = sanitizePhoneNumber(value).replace(/^00/, '+');

  if (!sanitized) {
    return {
      prefix: fallbackPrefix,
      number: '',
    };
  }

  const matchedOption = [...phonePrefixOptions]
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find((option) => sanitized.startsWith(option.prefix));

  if (matchedOption) {
    return {
      prefix: matchedOption.prefix,
      number: sanitized.slice(matchedOption.prefix.length).replace(/^0+/, ''),
    };
  }

  return {
    prefix: fallbackPrefix,
    number: sanitized.replace(/^\+/, '').replace(/^0+/, ''),
  };
}

function buildInternationalPhone(prefix, number) {
  const parsed = parseInternationalPhone(number, prefix || '+961');
  const localNumber = parsed.number || sanitizePhoneNumber(number).replace(/^\+/, '').replace(/^0+/, '');

  return localNumber ? `${parsed.prefix}${localNumber}` : '';
}

function buildInquiryTitle(serviceRequested, contactName, fallbackTitle = '') {
  const service = String(serviceRequested || '').trim();
  const contact = String(contactName || '').trim();

  if (service && contact) {
    return `${service} - ${contact}`;
  }

  return String(fallbackTitle || contact || service).trim();
}

function createLeadSchema(t) {
  return yup.object({
    title: yup.string().trim().nullable(),
    contactId: yup.string().nullable(),
    contactSalutation: yup.string().trim().nullable(),
    contactName: yup.string().trim().required(t('Contact is required.')),
    contactEmail: yup
      .string()
      .trim()
      .transform((value) => (value === '' ? null : value))
      .email(t('Enter a valid email address.'))
      .nullable(),
    phonePrefix: yup.string().trim().required(t('International code is required.')),
    phoneNumber: yup
      .string()
      .trim()
      .nullable()
      .test(
        'valid-phone-number',
        t('Enter a valid phone number.'),
        (value) => !value || /^\+?[\d\s().-]{6,20}$/.test(value),
      ),
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
  lead,
  open,
  ownerOptions,
  serviceOptions = [],
  sourceOptions,
  stageOptions,
  statusOptions,
  onClose,
  onSubmit,
}) {
  const { direction, t } = useLanguage();
  const isRtl = direction === 'rtl';
  const labelProps = {
    dir: direction,
  };
  const selectProps = {
    native: true,
    inputProps: {
      dir: direction,
      style: {
        textAlign: isRtl ? 'right' : 'left',
      },
    },
  };
  const textInputProps = {
    dir: direction,
    style: {
      textAlign: isRtl ? 'right' : 'left',
    },
  };
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: '',
      contactId: '',
      contactSalutation: '',
      contactName: '',
      contactEmail: '',
      phonePrefix: '+961',
      phoneNumber: '',
      source: '',
      stageId: '',
      ownerUserId: '',
      status: 'Open',
      estimatedCost: '',
      serviceRequested: '',
      message: '',
    },
    resolver: yupResolver(createLeadSchema(t)),
  });
  const watchedServiceRequested = watch('serviceRequested');
  const watchedContactName = watch('contactName');
  const watchedTitle = watch('title');
  const inquiryTitle = buildInquiryTitle(watchedServiceRequested, watchedContactName, watchedTitle);

  useEffect(() => {
    const parsedPhone = parseInternationalPhone(
      lead?.contact?.phone || lead?.phone || '',
      '+961',
    );

    reset({
      title: lead?.title || '',
      contactId: lead?.contactId || '',
      contactSalutation: lead?.contact?.salutation || lead?.contactSalutation || '',
      contactName: lead?.contact?.fullName || lead?.contactName || '',
      contactEmail: lead?.contact?.email || lead?.email || '',
      phonePrefix: parsedPhone.prefix,
      phoneNumber: parsedPhone.number,
      source: lead?.sourceId || lead?.leadSourceId || lead?.source || '',
      stageId: lead?.stageId || '',
      ownerUserId: lead?.ownerUserId || '',
      status: lead?.status || 'Open',
      estimatedCost: lead?.estimatedCost ?? '',
      serviceRequested: lead?.serviceRequested || '',
      message: lead?.message || '',
    });
  }, [lead, reset]);

  function normalizePhoneField(value, currentPrefix) {
    const parsedPhone = parseInternationalPhone(value, currentPrefix);

    setValue('phonePrefix', parsedPhone.prefix, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('phoneNumber', parsedPhone.number, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleFormSubmit(values) {
    const contactPhone = buildInternationalPhone(values.phonePrefix, values.phoneNumber);
    const payload = { ...values };
    delete payload.phonePrefix;
    delete payload.phoneNumber;

    return onSubmit({
      ...payload,
      title: buildInquiryTitle(values.serviceRequested, values.contactName, values.title),
      contactEmail: values.contactEmail || '',
      contactPhone,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        className: 'crm-lead-form-dialog',
        dir: direction,
      }}
    >
      <DialogTitle>{lead ? t('Edit lead') : t('Create lead')}</DialogTitle>
      <DialogContent>
        <Stack className="crm-lead-form" dir={direction} spacing={2} sx={{ pt: 1 }}>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={inquiryTitle}
                label={t('Inquiry')}
                InputLabelProps={labelProps}
                inputProps={{
                  ...textInputProps,
                  readOnly: true,
                }}
                error={Boolean(errors.title)}
                helperText={errors.title?.message}
              />
            )}
          />
          <Box className="crm-lead-form__identity-row">
            <Controller
              name="contactSalutation"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  SelectProps={selectProps}
                  InputLabelProps={{ ...labelProps, shrink: true }}
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
              name="contactName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Contact')}
                  InputLabelProps={labelProps}
                  inputProps={textInputProps}
                  error={Boolean(errors.contactName)}
                  helperText={errors.contactName?.message}
                />
              )}
            />
          </Box>
          <Box className="crm-lead-form__contact-row">
            <Controller
              name="contactEmail"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('Email')}
                  type="email"
                  InputLabelProps={labelProps}
                  inputProps={textInputProps}
                  error={Boolean(errors.contactEmail)}
                  helperText={errors.contactEmail?.message}
                />
              )}
            />
            <Box className="crm-lead-form__phone-row">
              <Controller
                name="phonePrefix"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    SelectProps={{
                      native: true,
                      inputProps: {
                        dir: 'ltr',
                      },
                    }}
                    InputLabelProps={{ ...labelProps, shrink: true }}
                    label={t('Code')}
                    error={Boolean(errors.phonePrefix)}
                    helperText={errors.phonePrefix?.message}
                  >
                    {phonePrefixOptions.map((option) => (
                      <option key={option.code} value={option.prefix}>
                        {option.prefix}
                      </option>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('Phone')}
                    InputLabelProps={labelProps}
                    inputProps={{
                      dir: 'ltr',
                      inputMode: 'tel',
                      style: {
                        textAlign: isRtl ? 'right' : 'left',
                      },
                    }}
                    onBlur={(event) => {
                      field.onBlur();
                      normalizePhoneField(event.target.value, getValues('phonePrefix'));
                    }}
                    onChange={(event) => field.onChange(event.target.value)}
                    error={Boolean(errors.phoneNumber)}
                    helperText={errors.phoneNumber?.message}
                  />
                )}
              />
            </Box>
          </Box>
          <Controller
            name="source"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={selectProps}
                InputLabelProps={{ ...labelProps, shrink: true }}
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
                SelectProps={selectProps}
                InputLabelProps={{ ...labelProps, shrink: true }}
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
                SelectProps={selectProps}
                InputLabelProps={{ ...labelProps, shrink: true }}
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
                SelectProps={selectProps}
                InputLabelProps={{ ...labelProps, shrink: true }}
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
                type="number"
                InputLabelProps={labelProps}
                inputProps={{
                  dir: 'ltr',
                  min: 0,
                  step: '0.01',
                  inputMode: 'decimal',
                  style: {
                    textAlign: isRtl ? 'right' : 'left',
                  },
                }}
                onChange={(event) => {
                  const { value } = event.target;

                  if (/^\d*\.?\d*$/.test(value)) {
                    field.onChange(value);
                  }
                }}
                onKeyDown={(event) => {
                  if (['e', 'E', '+', '-'].includes(event.key)) {
                    event.preventDefault();
                  }
                }}
                error={Boolean(errors.estimatedCost)}
                helperText={errors.estimatedCost?.message}
              />
            )}
          />
          <Controller
            name="serviceRequested"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                SelectProps={selectProps}
                InputLabelProps={{ ...labelProps, shrink: true }}
                label={t('Service requested')}
              >
                <option value="">{t('Select a service')}</option>
                {serviceOptions.map((option) => (
                  <option key={option} value={option}>
                    {t(option)}
                  </option>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('Message')}
                InputLabelProps={labelProps}
                inputProps={textInputProps}
                multiline
                minRows={3}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit(handleFormSubmit)} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? t('Saving...') : lead ? t('Save lead') : t('Create lead')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LeadFormDialog;
