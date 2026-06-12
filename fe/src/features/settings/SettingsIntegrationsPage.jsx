import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../shared/components/PageHeader.jsx';
import './integrations.css';

const supportedFields = [
  'fullName',
  'email',
  'phone',
  'serviceRequested',
  'estimatedCost',
  'message',
];

const hiddenTrackingFields = [
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'pageUrl',
  'honeypot',
];

const unsupportedChannels = [
  'Google lead forms',
  'Meta / Facebook lead forms',
  'Instagram lead forms',
  'WhatsApp',
  'SMS',
  'Email marketing automation',
];

function SettingsIntegrationsPage() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const captureEndpoint = `${apiBaseUrl}/api/public/lead-capture`;

  return (
    <Stack spacing={3} className="crm-integrations-page">
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        description="This MVP currently supports a single public landing-page connection that feeds the CRM lead intake flow."
      />

      <Card className="crm-card crm-integrations-page__hero">
        <CardContent className="crm-integrations-page__card-content">
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', lg: 'center' }}
          >
            <Stack spacing={1.25}>
              <Typography variant="h6">Landing page lead capture</Typography>
              <Typography className="crm-muted-text">
                The public form at <strong>/landing</strong> submits directly to the backend
                without authentication and creates inbound CRM leads.
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip label="Live in MVP" color="success" size="small" />
                <Chip label="Public endpoint" size="small" variant="outlined" />
                <Chip label="No auth required" size="small" variant="outlined" />
              </Stack>
            </Stack>
            <Button component={RouterLink} to="/landing" variant="contained">
              Open landing page
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <div className="crm-integrations-page__grid">
        <Card className="crm-card">
          <CardContent className="crm-integrations-page__card-content">
            <Stack spacing={1}>
              <Typography variant="h6">Connection details</Typography>
              <Typography className="crm-muted-text">
                Use this endpoint from the clinic website or a dedicated campaign landing page.
              </Typography>
            </Stack>
            <div className="crm-integrations-page__endpoint">
              <Typography variant="caption" className="crm-integrations-page__code-label">
                POST endpoint
              </Typography>
              <Typography component="code" className="crm-integrations-page__code-block">
                {captureEndpoint}
              </Typography>
            </div>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label="Route: /landing" size="small" />
              <Chip label="Success route: /lead-capture-success" size="small" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>

        <Card className="crm-card">
          <CardContent className="crm-integrations-page__card-content">
            <Stack spacing={1}>
              <Typography variant="h6">Payload fields</Typography>
              <Typography className="crm-muted-text">
                The public website should send these visible lead-capture fields.
              </Typography>
            </Stack>
            <div className="crm-integrations-page__chip-list">
              {supportedFields.map((field) => (
                <Chip key={field} label={field} size="small" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="crm-card">
          <CardContent className="crm-integrations-page__card-content">
            <Stack spacing={1}>
              <Typography variant="h6">Hidden tracking and spam protection</Typography>
              <Typography className="crm-muted-text">
                The landing page also captures attribution values and a honeypot field for basic
                spam defense.
              </Typography>
            </Stack>
            <div className="crm-integrations-page__chip-list">
              {hiddenTrackingFields.map((field) => (
                <Chip key={field} label={field} size="small" variant="outlined" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="crm-card">
          <CardContent className="crm-integrations-page__card-content">
            <Stack spacing={1}>
              <Typography variant="h6">Out of scope in this MVP</Typography>
              <Typography className="crm-muted-text">
                These channels are intentionally not connected yet, even though the settings page
                reserves the area for future expansion.
              </Typography>
            </Stack>
            <ul className="crm-integrations-page__list">
              {unsupportedChannels.map((channel) => (
                <li key={channel}>{channel}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Stack>
  );
}

export default SettingsIntegrationsPage;
