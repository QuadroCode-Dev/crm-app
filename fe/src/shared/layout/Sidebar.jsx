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
import './layout.css';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Pipeline', to: '/pipeline' },
  { label: 'Leads', to: '/leads' },
  { label: 'Contacts', to: '/contacts' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'Reports', to: '/reports' },
];

const settingsItems = [
  { label: 'Pipeline stages', to: '/settings/pipeline' },
  { label: 'Automation rules', to: '/settings/automation' },
  { label: 'Integrations', to: '/settings/integrations' },
];

function SidebarLink({ label, to, onNavigate }) {
  return (
    <ListItemButton
      component={NavLink}
      to={to}
      className="crm-sidebar__link"
      onClick={onNavigate}
    >
      <ListItemText primary={label} />
    </ListItemButton>
  );
}

function Sidebar({ onNavigate }) {
  return (
    <Box className="crm-sidebar">
      <Stack spacing={1} className="crm-sidebar__brand">
        <Typography variant="overline" className="crm-eyebrow">
          CRM Workspace
        </Typography>
        <Typography variant="h5">Northstar Pipeline</Typography>
        <Typography variant="body2" className="crm-muted-text">
          A modern sales cockpit with room for leads, tasks, and reporting.
        </Typography>
      </Stack>
      <Divider />
      <Box className="crm-sidebar__section">
        <Typography variant="caption" className="crm-sidebar__section-title">
          Workspace
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
          Settings
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
