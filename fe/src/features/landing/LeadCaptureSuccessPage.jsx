import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { getLeadCaptureSuccess } from './landingStorage.js';
import './landing.css';

function LeadCaptureSuccessPage() {
  const location = useLocation();
  const successState = location.state || getLeadCaptureSuccess();

  return (
    <Card className="crm-public-card crm-public-card--success">
      <CardContent className="crm-card-content-padded">
        <Stack spacing={2} className="crm-public-card__content">
          <Chip label="Request received" className="crm-public-card__chip" />
          <Typography variant="overline" className="crm-eyebrow">
            Public lead capture
          </Typography>
          <Typography variant="h3">Thanks, we received your request.</Typography>
          <Typography className="crm-muted-text">
            Our team will review your details and follow up through the contact method you
            provided.
          </Typography>
          {successState?.trackingId ? (
            <Typography variant="body2" className="crm-public-card__tracking">
              Tracking ID: {successState.trackingId}
            </Typography>
          ) : null}
          <Button component={RouterLink} to="/landing" variant="outlined" className="crm-public-card__button">
            Submit another request
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default LeadCaptureSuccessPage;
