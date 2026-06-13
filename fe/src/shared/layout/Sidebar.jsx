import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { NavLink } from 'react-router-dom';
import useLanguage from '../hooks/useLanguage.js';
import usePlatformCustomization from '../hooks/usePlatformCustomization.js';
import './layout.css';

const navItems = [
  { labelKey: 'navigation.dashboard', to: '/dashboard' },
  { labelKey: 'navigation.pipeline', to: '/pipeline' },
  { labelKey: 'navigation.leads', to: '/leads' },
  { labelKey: 'navigation.contacts', to: '/contacts' },
  { labelKey: 'navigation.tasks', to: '/tasks' },
  { labelKey: 'navigation.reports', to: '/reports' },
];

const settingsItems = [
  { labelKey: 'navigation.pipelineStages', to: '/settings/pipeline' },
  { labelKey: 'navigation.automationRules', to: '/settings/automation' },
  { labelKey: 'navigation.integrations', to: '/settings/integrations' },
  { labelKey: 'navigation.customization', to: '/settings/customization' },
];

function SidebarLink({ labelKey, to, onNavigate }) {
  const { t } = useLanguage();

  return (
    <ListItemButton
      component={NavLink}
      to={to}
      className="crm-sidebar__link"
      onClick={onNavigate}
    >
      <ListItemText
        primary={t(labelKey)}
        primaryTypographyProps={{
          className: 'crm-sidebar__link-text',
        }}
      />
    </ListItemButton>
  );
}

function Sidebar({ onNavigate }) {
  const { direction, t } = useLanguage();
  const { logoSrc } = usePlatformCustomization();

  return (
    <Box className="crm-sidebar" dir={direction}>
      <Stack spacing={1} className="crm-sidebar__brand">
        <Box className="crm-sidebar__logo-frame">
          <Box
            alt={t('Platform logo')}
            className="crm-sidebar__logo"
            component="img"
            src={logoSrc}
          />
        </Box>
        <Typography className="crm-sidebar__tagline">
          {t('Your sales pipeline, simplified.')}
        </Typography>
      </Stack>
      <Divider />
      <Box className="crm-sidebar__section">
        <Typography variant="caption" className="crm-sidebar__section-title">
          {t('app.workspaceLabel')}
        </Typography>
        <List disablePadding className="crm-sidebar__list">
          {navItems.map((item) => (
            <SidebarLink key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </List>
      </Box>
      <Divider />
      <Box className="crm-sidebar__section">
        <Typography variant="caption" className="crm-sidebar__section-title">
          {t('app.settingsLabel')}
        </Typography>
        <List disablePadding className="crm-sidebar__list">
          {settingsItems.map((item) => (
            <SidebarLink key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </List>
      </Box>
    </Box>
  );
}

export default Sidebar;
