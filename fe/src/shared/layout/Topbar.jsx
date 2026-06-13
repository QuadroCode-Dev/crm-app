import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
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
                <MenuIcon />
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
            <Chip color="secondary" label={t('app.shellBadge')} variant="filled" />
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
                {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
              </IconButton>
            </Tooltip>
            <Typography variant="body2" className="crm-muted-text">
              {user?.fullName || user?.name || user?.email || t('app.signedIn')}
            </Typography>
            <Button color="primary" onClick={logout} variant="outlined">
              {t('app.logout')}
            </Button>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default Topbar;
