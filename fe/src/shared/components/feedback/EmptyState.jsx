import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import '../shared-components.css';

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <Card className="crm-card crm-empty-state" role="region" aria-live="polite">
      <CardContent className="crm-empty-state__card-content">
        <Stack spacing={2} alignItems="flex-start" className="crm-empty-state__content">
          <Typography variant="h5">{title}</Typography>
          <Typography className="crm-muted-text">{description}</Typography>
          {actionLabel ? (
            <Button onClick={onAction} variant="contained" type="button">
              {actionLabel}
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default EmptyState;
