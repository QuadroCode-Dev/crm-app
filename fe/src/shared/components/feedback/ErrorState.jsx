import { Alert, Button, Card, CardContent, Stack } from '@mui/material';
import '../shared-components.css';

function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again in a moment.',
  onRetry,
}) {
  return (
    <Card className="crm-card crm-error-state">
      <CardContent>
        <Stack spacing={2} alignItems="flex-start">
          <Alert severity="error" role="alert" className="crm-error-state__alert">
            <strong>{title}</strong> {description}
          </Alert>
          {onRetry ? (
            <Button onClick={onRetry} variant="outlined" type="button">
              Retry
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ErrorState;
