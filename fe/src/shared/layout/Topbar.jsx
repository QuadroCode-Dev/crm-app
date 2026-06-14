import {
  AppBar,
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { List, Moon, SignOut, Sun, UserCircle } from '@phosphor-icons/react';
import useColorMode from '../hooks/useColorMode.js';
import useAuth from '../hooks/useAuth.js';
import useLanguage from '../hooks/useLanguage.js';
import { usePageHeader } from '../components/PageHeaderContext.jsx';
import './layout.css';

function Topbar({ onToggleMenu, showMenuButton = false }) {
  const { direction, language, languageOptions, setLanguage, t } = useLanguage();
  const { mode, toggleMode } = useColorMode();
  const appName = import.meta.env.VITE_APP_NAME || t('app.appNameFallback');
  const { logout, user } = useAuth();
  const pageHeader = usePageHeader();
  const colorModeLabel = mode === 'dark' ? t('app.switchToLight') : t('app.switchToDark');
  const title = pageHeader.title || appName;
  const description = pageHeader.description;
  const logoutIcon = <SignOut size={17} weight="bold" />;

  return (
    <AppBar color="transparent" dir={direction} elevation={0} position="sticky" className="crm-topbar">
      <Toolbar className="crm-topbar__toolbar">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          className="crm-topbar__content"
        >
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            className="crm-topbar__identity"
          >
            {showMenuButton ? (
              <IconButton
                aria-label={t('app.openNavigation')}
                className="crm-topbar__menu-button"
                color="primary"
                onClick={onToggleMenu}
              >
                <List size={22} weight="bold" />
              </IconButton>
            ) : null}
            <Box>
              <Typography variant="h5" className="crm-topbar__title">
                {title}
              </Typography>
              {description ? (
                <Typography className="crm-topbar__description">
                  {description}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          {pageHeader.actions ? (
            <Box className="crm-topbar__page-actions">{pageHeader.actions}</Box>
          ) : null}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            className="crm-topbar__actions"
          >
            <Select
              aria-label={t('app.language')}
              className="crm-topbar__language-select"
              onChange={(event) => setLanguage(event.target.value)}
              size="small"
              value={language}
            >
              {languageOptions.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <Tooltip title={colorModeLabel}>
              <IconButton
                aria-label={colorModeLabel}
                className="crm-topbar__mode-button"
                color="primary"
                onClick={toggleMode}
              >
                {mode === 'dark' ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
              </IconButton>
            </Tooltip>
            <Stack direction="row" spacing={0.75} alignItems="center" className="crm-topbar__user">
              <UserCircle size={20} weight="duotone" />
              <Typography variant="body2" className="crm-muted-text">
                {user?.fullName || user?.name || user?.email || t('app.signedIn')}
              </Typography>
            </Stack>
            <Button
              className="crm-topbar__logout-button"
              color="primary"
              endIcon={direction === 'rtl' ? logoutIcon : null}
              onClick={logout}
              startIcon={direction === 'rtl' ? null : logoutIcon}
              variant="outlined"
            >
              {t('app.logout')}
            </Button>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default Topbar;
