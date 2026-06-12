import { Stack, Typography } from '@mui/material';
import './shared-components.css';

function PageHeader({ eyebrow, title, description, actions = null }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'center' }}
      spacing={2}
      className="crm-page-header"
    >
      <Stack spacing={0.75}>
        {eyebrow ? (
          <Typography variant="overline" className="crm-eyebrow">
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h4">{title}</Typography>
        {description ? (
          <Typography className="crm-muted-text">{description}</Typography>
        ) : null}
      </Stack>
      {actions}
    </Stack>
  );
}

export default PageHeader;
