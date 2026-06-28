import {
  Box,
  Divider,
  List,
  ListItemIcon,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import {
  ChartBar,
  GearSix,
  GitBranch,
  Handshake,
  House,
  Lifebuoy,
  Lightning,
  Palette,
  PlugsConnected,
  Tag,
  SquaresFour,
  UserGear,
  Users,
} from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';
import packageJson from '../../../package.json';
import useAuth from '../hooks/useAuth.js';
import useLanguage from '../hooks/useLanguage.js';
import usePlatformCustomization from '../hooks/usePlatformCustomization.js';
import './layout.css';

const navItems = [
  { icon: House, labelKey: 'navigation.dashboard', to: '/dashboard' },
  { icon: GitBranch, labelKey: 'navigation.pipeline', to: '/pipeline', permission: 'pipeline.view' },
  { icon: Handshake, labelKey: 'navigation.leads', to: '/leads' },
  { icon: Users, labelKey: 'navigation.contacts', to: '/contacts' },
  { icon: SquaresFour, labelKey: 'navigation.tasks', to: '/tasks' },
  { icon: ChartBar, labelKey: 'navigation.reports', to: '/reports', permission: 'reports.view' },
];

const settingsItems = [
  {
    icon: UserGear,
    labelKey: 'navigation.usersManagement',
    to: '/users-management',
    roles: ['SuperAdmin', 'Admin'],
  },
  {
    icon: GearSix,
    labelKey: 'navigation.pipelineStages',
    to: '/settings/pipeline',
    permission: 'settings.pipeline.manage',
  },
  {
    icon: Lightning,
    labelKey: 'navigation.automationRules',
    to: '/settings/automation',
    permission: 'settings.automation.manage',
  },
  {
    icon: PlugsConnected,
    labelKey: 'navigation.integrations',
    to: '/settings/integrations',
    permission: 'settings.integrations.manage',
  },
  {
    icon: Tag,
    labelKey: 'navigation.services',
    to: '/settings/services',
    permission: 'settings.services.manage',
  },
  {
    icon: Palette,
    labelKey: 'navigation.customization',
    to: '/settings/customization',
    permission: 'settings.manage',
  },
];

const supportItems = [
  { icon: Lifebuoy, labelKey: 'navigation.help', to: '/help' },
];

function SidebarLink({ icon: Icon, labelKey, to, onNavigate }) {
  const { t } = useLanguage();

  return (
    <ListItemButton
      component={NavLink}
      to={to}
      className="crm-sidebar__link"
      onClick={onNavigate}
    >
      {Icon ? (
        <ListItemIcon className="crm-sidebar__link-icon">
          <Icon size={19} weight="duotone" />
        </ListItemIcon>
      ) : null}
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
  const { user } = useAuth();
  const { direction, t } = useLanguage();
  const { logoSrc } = usePlatformCustomization();
  const permissions = new Set(user?.permissions || []);
  const visibleNavItems = navItems.filter(
    (item) => !item.permission || permissions.has(item.permission),
  );
  const visibleSettingsItems = settingsItems.filter(
    (item) =>
      (!item.roles || item.roles.includes(user?.role)) &&
      (!item.permission || permissions.has(item.permission)),
  );

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
          {visibleNavItems.map((item) => (
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
          {visibleSettingsItems.map((item) => (
            <SidebarLink key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </List>
      </Box>
      <Divider />
      <Box className="crm-sidebar__section crm-sidebar__section--support">
        <Typography variant="caption" className="crm-sidebar__section-title">
          {t('app.supportLabel')}
        </Typography>
        <List disablePadding className="crm-sidebar__list">
          {supportItems.map((item) => (
            <SidebarLink key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </List>
      </Box>
      <Box className="crm-sidebar__footer">
        <Typography className="crm-sidebar__footer-text">
          Developed by - QuadroCode
        </Typography>
        <Typography className="crm-sidebar__footer-text">
          Version {packageJson.version}
        </Typography>
      </Box>
    </Box>
  );
}

export default Sidebar;
