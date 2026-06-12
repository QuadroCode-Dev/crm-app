import { Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import '../shared-components.css';

function LoadingState() {
  return (
    <Card className="crm-card crm-loading-state" role="status" aria-live="polite" aria-busy="true">
      <CardContent>
        <Stack spacing={2}>
          <Typography className="crm-visually-hidden">Loading content</Typography>
          <Skeleton variant="text" width="35%" height={40} />
          <Skeleton variant="rounded" height={64} />
          <Skeleton variant="rounded" height={64} />
          <Skeleton variant="rounded" height={64} />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default LoadingState;
