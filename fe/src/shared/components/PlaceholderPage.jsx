import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import PageHeader from './PageHeader.jsx';
import EmptyState from './feedback/EmptyState.jsx';
import './shared-components.css';

function PlaceholderPage({
  eyebrow,
  title,
  description,
  helperText,
  chipLabel = 'Placeholder',
}) {
  return (
    <Stack spacing={3} className="crm-placeholder-page">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Chip color="secondary" label={chipLabel} />}
      />
      <Card className="crm-card">
        <CardContent>
          <Stack spacing={2} className="crm-placeholder-page__content">
            <Typography variant="body1">{helperText}</Typography>
            <Button variant="outlined" disabled>
              Coming in a later task
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <EmptyState
        title={`${title} is ready for implementation`}
        description="This route is wired into the CRM shell and waiting for feature work in a later task."
      />
    </Stack>
  );
}

export default PlaceholderPage;
