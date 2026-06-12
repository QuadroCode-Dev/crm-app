import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid2,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { submitLeadCapture } from '../../api/publicApi.js';
import { normalizeApiError } from '../../api/normalizeApiError.js';
import useLanguage from '../../shared/hooks/useLanguage.js';
import { saveLeadCaptureSuccess } from './landingStorage.js';
import './landing.css';

function createLandingSchema(t) {
  return yup
    .object({
      fullName: yup.string().trim().required(t('Full name is required.')),
    email: yup
      .string()
      .trim()
      .nullable()
      .transform((value) => value || '')
      .test('email-format', t('Enter a valid email address.'), (value) => {
        if (!value) {
          return true;
        }

        return yup.string().email().isValidSync(value);
      }),
    phone: yup.string().trim().nullable().default(''),
    serviceRequested: yup.string().trim().nullable(),
    estimatedCost: yup
      .number()
      .transform((value, originalValue) => (originalValue === '' ? null : value))
      .nullable()
      .typeError(t('Estimated cost must be a number.')),
    message: yup.string().trim().nullable(),
    utmSource: yup.string().trim().nullable(),
    utmMedium: yup.string().trim().nullable(),
    utmCampaign: yup.string().trim().nullable(),
    pageUrl: yup.string().trim().required(),
    honeypot: yup
      .string()
      .test('honeypot-empty', t('Spam detection was triggered.'), (value) => !value),
    })
    .test('email-or-phone', t('Provide at least an email or phone number.'), (value, context) => {
      if (value?.email || value?.phone) {
        return true;
      }

      return context.createError({
        path: 'phone',
        message: t('Provide at least an email or phone number.'),
      });
    });
}

function LandingPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const pageUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location.origin !== 'null'
        ? window.location.origin
        : 'http://localhost';

    return `${origin}${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      serviceRequested: '',
      estimatedCost: '',
      message: '',
      utmSource: searchParams.get('utm_source') || '',
      utmMedium: searchParams.get('utm_medium') || '',
      utmCampaign: searchParams.get('utm_campaign') || '',
      pageUrl,
      honeypot: '',
    },
    resolver: yupResolver(createLandingSchema(t)),
  });

  const leadCaptureMutation = useMutation({
    mutationFn: submitLeadCapture,
    onSuccess: (response) => {
      const successPayload = {
        trackingId: response.trackingId || '',
        message: response.message || t('Lead received successfully'),
      };

      saveLeadCaptureSuccess(successPayload);
      navigate('/lead-capture-success', {
        replace: true,
        state: successPayload,
      });
    },
    onError: (error) => {
      const normalizedError = normalizeApiError(error);

      setError('root', {
        type: 'server',
        message:
          normalizedError.message === 'Submission rejected.'
            ? t('We could not submit your request. Please review the form and try again.')
            : t('We could not send your request right now. Please try again in a moment.'),
      });
    },
  });

  function onSubmit(values) {
    leadCaptureMutation.mutate({
      ...values,
      estimatedCost:
        values.estimatedCost === '' || values.estimatedCost === null
          ? null
          : Number(values.estimatedCost),
    });
  }

  return (
    <Card className="crm-public-card crm-public-card--landing">
      <CardContent className="crm-card-content-padded">
        <Grid2 container spacing={4} className="crm-public-card__grid">
          <Grid2 size={{ xs: 12, md: 5 }}>
            <Stack spacing={2.5} className="crm-public-card__content">
              <Typography variant="overline" className="crm-eyebrow">
                {t('Public lead capture')}
              </Typography>
              <Typography variant="h2" className="crm-public-card__title">
                {t('Turn campaign traffic into qualified conversations.')}
              </Typography>
              <Typography className="crm-muted-text crm-public-card__description">
                {t('Share your project details and the CRM will route your inquiry into the sales pipeline for fast follow-up.')}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip label={t('No login required')} />
                <Chip label={t('UTM tracking ready')} />
                <Chip label={t('Spam honeypot enabled')} />
              </Stack>
            </Stack>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 7 }}>
            <Box component="form" className="crm-public-form" onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2.5}>
                <Typography variant="h5">{t('Request a callback')}</Typography>
                <Typography className="crm-muted-text">
                  {t('Tell us what you need. Email or phone is enough for us to reach back out.')}
                </Typography>
                {errors.root?.message ? (
                  <Alert severity="error">{errors.root.message}</Alert>
                ) : null}
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="fullName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={t('Full name')}
                          error={Boolean(errors.fullName)}
                          helperText={errors.fullName?.message}
                        />
                      )}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="serviceRequested"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label={t('Service requested')} />
                      )}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={t('Email')}
                          error={Boolean(errors.email)}
                          helperText={errors.email?.message}
                        />
                      )}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={t('Phone')}
                          error={Boolean(errors.phone)}
                          helperText={errors.phone?.message}
                        />
                      )}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="estimatedCost"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={t('Estimated cost')}
                          error={Boolean(errors.estimatedCost)}
                          helperText={errors.estimatedCost?.message}
                        />
                      )}
                    />
                  </Grid2>
                  <Grid2 size={{ xs: 12 }}>
                    <Controller
                      name="message"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label={t('Message')} multiline minRows={4} />
                      )}
                    />
                  </Grid2>
                </Grid2>
                <Controller
                  name="utmSource"
                  control={control}
                  render={({ field }) => (
                    <input {...field} type="hidden" aria-label={t('UTM source')} />
                  )}
                />
                <Controller
                  name="utmMedium"
                  control={control}
                  render={({ field }) => (
                    <input {...field} type="hidden" aria-label={t('UTM medium')} />
                  )}
                />
                <Controller
                  name="utmCampaign"
                  control={control}
                  render={({ field }) => (
                    <input {...field} type="hidden" aria-label={t('UTM campaign')} />
                  )}
                />
                <Controller
                  name="pageUrl"
                  control={control}
                  render={({ field }) => (
                    <input {...field} type="hidden" aria-label={t('Page URL')} />
                  )}
                />
                <Controller
                  name="honeypot"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="hidden"
                      aria-label={t('Honeypot')}
                      data-testid="landing-honeypot"
                    />
                  )}
                />
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Typography variant="body2" className="crm-muted-text">
                    {t('By submitting, you agree to be contacted about this request.')}
                  </Typography>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={leadCaptureMutation.isPending}
                  >
                    {leadCaptureMutation.isPending ? t('Sending...') : t('Submit request')}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Grid2>
        </Grid2>
      </CardContent>
    </Card>
  );
}

export default LandingPage;
