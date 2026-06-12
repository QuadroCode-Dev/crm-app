import { Alert, Button, Card, CardContent, Stack } from '@mui/material';
import '../shared-components.css';
import useLanguage from '../../hooks/useLanguage.js';

function ErrorState({
  title,
  description,
  onRetry,
}) {
  const { t } = useLanguage();

  return (
    <Card className="crm-card crm-error-state">
      <CardContent>
        <Stack spacing={2} alignItems="flex-start">
          <Alert severity="error" role="alert" className="crm-error-state__alert">
            <strong>{title || t('Something went wrong')}</strong>{' '}
            {description || t('Please try again in a moment.')}
          </Alert>
          {onRetry ? (
            <Button onClick={onRetry} variant="outlined" type="button">
              {t('Retry')}
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ErrorState;
