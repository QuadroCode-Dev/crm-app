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
      <ListItemText primary={t(labelKey)} />
    </ListItemButton>
  );
}

function Sidebar({ onNavigate }) {
  const { t } = useLanguage();

  return (
    <Box className="crm-sidebar">
      <Stack spacing={1} className="crm-sidebar__brand">
        <Typography variant="overline" className="crm-eyebrow">
          {t('app.brandEyebrow')}
        </Typography>
        <Typography variant="h5">{t('app.brandName')}</Typography>
        <Typography variant="body2" className="crm-muted-text">
          {t('app.brandDescription')}
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
