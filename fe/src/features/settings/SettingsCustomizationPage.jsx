import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useRef } from 'react';
import PageHeader from '../../shared/components/PageHeader.jsx';
import useLanguage from '../../shared/hooks/useLanguage.js';
import usePlatformCustomization from '../../shared/hooks/usePlatformCustomization.js';
import './customization.css';

function ThemePreview({ colors }) {
  const swatches = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.success,
    colors.warning,
    colors.danger,
  ];

  return (
    <Box className="crm-customization-page__theme-preview">
      {swatches.map((color) => (
        <Box
          key={color}
          className="crm-customization-page__swatch"
          style={{ backgroundColor: color }}
        />
      ))}
    </Box>
  );
}

function SettingsCustomizationPage() {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const {
    activeTheme,
    activeFontSize,
    defaultLogoSrc,
    fontSize,
    fontSizeOptions,
    logoSrc,
    resetLogo,
    setFontSize,
    setLogoSrc,
    setTheme,
    themeId,
    themeOptions,
  } = usePlatformCustomization();

  function handleLogoFileChange(event) {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoSrc(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  return (
    <Stack spacing={3} className="crm-customization-page">
      <PageHeader
        eyebrow={t('Settings')}
        title={t('Platform customization')}
        description={t('Adjust the client logo, theme, typography, and interface density for this CRM workspace.')}
      />

      <Card className="crm-card">
        <CardContent className="crm-customization-page__section">
          <Stack spacing={1}>
            <Typography variant="h6">{t('Client logo')}</Typography>
            <Typography className="crm-muted-text">
              {t('Upload a client logo for the sidebar brand area. The default logo is used until a custom logo is selected.')}
            </Typography>
          </Stack>

          <Box className="crm-customization-page__logo-panel">
            <Box className="crm-customization-page__logo-preview">
              <Box
                alt={t('Platform logo preview')}
                className="crm-customization-page__logo-image"
                component="img"
                src={logoSrc || defaultLogoSrc}
              />
            </Box>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="contained" onClick={() => fileInputRef.current?.click()}>
                {t('Upload logo')}
              </Button>
              <Button variant="outlined" onClick={resetLogo}>
                {t('Use default logo')}
              </Button>
            </Stack>
            <input
              ref={fileInputRef}
              accept="image/*"
              className="crm-customization-page__file-input"
              onChange={handleLogoFileChange}
              type="file"
            />
          </Box>
        </CardContent>
      </Card>

      <Card className="crm-card">
        <CardContent className="crm-customization-page__section">
          <Stack spacing={1}>
            <Typography variant="h6">{t('Theme and font')}</Typography>
            <Typography className="crm-muted-text">
              {t('Choose a visual preset. Each theme applies its matching font family automatically.')}
            </Typography>
          </Stack>

          <Box className="crm-customization-page__theme-grid">
            {themeOptions.map((option) => (
              <Card
                key={option.id}
                className="crm-customization-page__theme-card"
                variant={themeId === option.id ? 'elevation' : 'outlined'}
              >
                <CardActionArea
                  className="crm-customization-page__theme-action"
                  onClick={() => setTheme(option.id)}
                >
                  <CardContent className="crm-customization-page__theme-content">
                    <Stack spacing={1}>
                      <Box className="crm-customization-page__theme-header">
                        <Typography variant="subtitle1">{t(option.name)}</Typography>
                        {themeId === option.id ? (
                          <Chip color="primary" label={t('Selected')} size="small" />
                        ) : null}
                      </Box>
                      <Typography className="crm-muted-text">
                        {t('Font')}: {option.fontLabel}
                      </Typography>
                    </Stack>
                    <ThemePreview colors={option.colors} />
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card className="crm-card">
        <CardContent className="crm-customization-page__section">
          <Stack spacing={1}>
            <Typography variant="h6">{t('Font size')}</Typography>
            <Typography className="crm-muted-text">
              {t('Set the default interface text scale for this browser.')}
            </Typography>
          </Stack>

          <ToggleButtonGroup
            exclusive
            className="crm-customization-page__font-size-toggle"
            value={fontSize}
            onChange={(_event, nextValue) => {
              if (nextValue) {
                setFontSize(nextValue);
              }
            }}
          >
            {fontSizeOptions.map((option) => (
              <ToggleButton key={option.id} value={option.id}>
                {t(option.label)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box className="crm-customization-page__summary">
            <Typography variant="subtitle2">{t('Current selection')}</Typography>
            <Typography className="crm-muted-text">
              {t(activeTheme.name)} + {activeTheme.fontLabel}, {t(activeFontSize.label)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default SettingsCustomizationPage;
