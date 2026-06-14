import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import useAuth from '../../shared/hooks/useAuth.js';
import useLanguage from '../../shared/hooks/useLanguage.js';
import './auth.css';

function createLoginSchema(t) {
  return yup.object({
    email: yup
      .string()
      .trim()
      .email(t('Enter a valid email address.'))
      .required(t('Email is required.')),
    password: yup.string().required(t('Password is required.')),
  });
}

const defaultValues = {
  email: '',
  password: '',
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { language, languageOptions, setLanguage, t } = useLanguage();
  const redirectTo = location.state?.from?.pathname || '/dashboard';
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    defaultValues,
    resolver: yupResolver(createLoginSchema(t)),
  });

  async function onSubmit(values) {
    try {
      await login(values);
      navigate(redirectTo, {
        replace: true,
      });
    } catch (error) {
      setError('root', {
        message:
          error.response?.data?.message ||
          t('We could not sign you in. Please check your credentials and try again.'),
      });
    }
  }

  return (
    <Card className="crm-login-card">
      <CardContent className="crm-card-content-padded">
        <Stack component="form" className="crm-login-form" onSubmit={handleSubmit(onSubmit)}>
          <Box className="crm-login-form__language">
            <Select
              inputProps={{ 'aria-label': t('app.language') }}
              onChange={(event) => setLanguage(event.target.value)}
              size="small"
              value={language}
            >
              {languageOptions.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Stack spacing={1} className="crm-login-form__header">
            <Typography variant="overline" className="crm-eyebrow">
              {t('Authentication')}
            </Typography>
            <Typography variant="h4">{t('Login')}</Typography>
            <Typography className="crm-muted-text">
              {t('Sign in to access the CRM workspace.')}
            </Typography>
          </Stack>
          {errors.root?.message ? (
            <Alert severity="error">{errors.root.message}</Alert>
          ) : null}
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                {...field}
                autoComplete="email"
                error={Boolean(errors.email)}
                fullWidth
                helperText={errors.email?.message}
                inputProps={{ dir: 'ltr' }}
                label={t('Email')}
                type="email"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                {...field}
                autoComplete="current-password"
                error={Boolean(errors.password)}
                fullWidth
                helperText={errors.password?.message}
                inputProps={{ dir: 'ltr' }}
                label={t('Password')}
                type="password"
              />
            )}
          />
          <Box className="crm-login-form__actions">
            <Button disabled={isSubmitting} type="submit" variant="contained">
              {isSubmitting ? t('Signing in...') : t('Sign in')}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default LoginPage;
