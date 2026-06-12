import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Box, Button, Chip, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import useAuth from '../hooks/useAuth.js';
import './layout.css';

function Topbar({ onToggleMenu, showMenuButton = false }) {
  const appName = import.meta.env.VITE_APP_NAME || 'CRM';
  const { logout, user } = useAuth();

  return (
    <AppBar color="transparent" elevation={0} position="fixed" className="crm-topbar">
      <Toolbar className="crm-topbar__toolbar">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          className="crm-topbar__content"
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            {showMenuButton ? (
              <IconButton
                aria-label="Open navigation menu"
                className="crm-topbar__menu-button"
                color="primary"
                onClick={onToggleMenu}
              >
                <MenuIcon />
              </IconButton>
            ) : null}
            <Box>
              <Typography variant="body2" className="crm-muted-text">
                Sales workspace
              </Typography>
              <Typography variant="h6">{appName}</Typography>
            </Box>
          </Stack>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            className="crm-topbar__actions"
          >
            <Chip color="secondary" label="MVP shell" variant="filled" />
            <Typography variant="body2" className="crm-muted-text">
              {user?.fullName || user?.name || user?.email || 'Signed in'}
            </Typography>
            <Button color="primary" onClick={logout} variant="outlined">
              Logout
            </Button>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default Topbar;
