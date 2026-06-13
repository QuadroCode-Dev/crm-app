import {
  CssBaseline,
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from '@mui/material';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import useLanguage from '../../shared/hooks/useLanguage.js';

const CUSTOMIZATION_STORAGE_KEY = 'crm.preferences.customization';
export const DEFAULT_LOGO_SRC = '/assets/default-logo.png';

const ColorModeContext = createContext(null);
const PlatformCustomizationContext = createContext(null);

export const themePresets = {
  professionalBlue: {
    id: 'professionalBlue',
    name: 'Professional Blue',
    fontLabel: 'Inter',
    fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mode: 'light',
    colors: {
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      secondary: '#0F172A',
      accent: '#38BDF8',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
    },
  },
  emeraldBusiness: {
    id: 'emeraldBusiness',
    name: 'Emerald Business',
    fontLabel: 'IBM Plex Sans',
    fontFamily: '"IBM Plex Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mode: 'light',
    colors: {
      primary: '#10B981',
      primaryHover: '#059669',
      secondary: '#064E3B',
      accent: '#34D399',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
    },
  },
  modernPurple: {
    id: 'modernPurple',
    name: 'Modern Purple',
    fontLabel: 'Plus Jakarta Sans',
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mode: 'light',
    colors: {
      primary: '#7C3AED',
      primaryHover: '#6D28D9',
      secondary: '#312E81',
      accent: '#A78BFA',
      background: '#FAFAFC',
      surface: '#FFFFFF',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
    },
  },
  darkEnterprise: {
    id: 'darkEnterprise',
    name: 'Dark Enterprise',
    fontLabel: 'Manrope',
    fontFamily: '"Manrope", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    mode: 'dark',
    colors: {
      primary: '#06B6D4',
      primaryHover: '#0891B2',
      secondary: '#111827',
      accent: '#22D3EE',
      background: '#0F172A',
      surface: '#1E293B',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
    },
  },
};

export const themeOptions = [
  themePresets.professionalBlue,
  themePresets.modernPurple,
  themePresets.emeraldBusiness,
  themePresets.darkEnterprise,
];

export const fontSizeOptions = [
  { id: 'small', label: 'Small', scale: 0.94 },
  { id: 'medium', label: 'Medium', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.08 },
];

function getStoredCustomization() {
  if (typeof window === 'undefined') {
    return {
      themeId: themePresets.professionalBlue.id,
      fontSize: 'medium',
      logoSrc: DEFAULT_LOGO_SRC,
    };
  }

  try {
    const storedValue = JSON.parse(window.localStorage.getItem(CUSTOMIZATION_STORAGE_KEY));

    return {
      themeId: themePresets[storedValue?.themeId]
        ? storedValue.themeId
        : themePresets.professionalBlue.id,
      fontSize: fontSizeOptions.some((option) => option.id === storedValue?.fontSize)
        ? storedValue.fontSize
        : 'medium',
      logoSrc: storedValue?.logoSrc || DEFAULT_LOGO_SRC,
    };
  } catch {
    return {
      themeId: themePresets.professionalBlue.id,
      fontSize: 'medium',
      logoSrc: DEFAULT_LOGO_SRC,
    };
  }
}

function createCrmTheme(themePreset, fontSizeOption, direction) {
  const isDark = themePreset.mode === 'dark';
  const { colors } = themePreset;
  const baseFontSize = 14 * fontSizeOption.scale;

  return createTheme({
    direction,
    palette: {
      mode: themePreset.mode,
      primary: {
        main: colors.primary,
        dark: colors.primaryHover,
      },
      secondary: {
        main: colors.secondary,
      },
      success: {
        main: colors.success,
      },
      warning: {
        main: colors.warning,
      },
      error: {
        main: colors.danger,
      },
      background: {
        default: colors.background,
        paper: colors.surface,
      },
      text: {
        primary: colors.textPrimary,
        secondary: colors.textSecondary,
      },
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: themePreset.fontFamily,
      fontSize: baseFontSize,
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontWeight: 700,
      },
      overline: {
        fontWeight: 700,
        letterSpacing: '0.08em',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 16px 36px rgba(0, 0, 0, 0.32)'
              : '0 12px 32px rgba(15, 23, 42, 0.08)',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: colors.textSecondary,
            '&.Mui-focused': {
              color: colors.primary,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#111827' : colors.surface,
            color: colors.textPrimary,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#334155' : '#dbe4f0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.accent,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary,
            },
            '&.Mui-disabled': {
              backgroundColor: isDark ? '#111827' : '#f4f7fb',
              color: isDark ? '#7d8aa3' : '#8b96a8',
            },
          },
          input: {
            '&::placeholder': {
              color: colors.textSecondary,
              opacity: 1,
            },
            '&::-webkit-calendar-picker-indicator': {
              filter: isDark ? 'invert(1)' : 'none',
              opacity: 0.82,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: colors.textSecondary,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: colors.surface,
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: colors.primary,
          },
        },
      },
    },
  });
}

function applyCssVariables(themePreset, fontSizeOption) {
  if (typeof document === 'undefined') {
    return;
  }

  const { colors } = themePreset;
  const rootStyle = document.documentElement.style;
  const surfaceBlend =
    themePreset.mode === 'dark'
      ? `color-mix(in srgb, ${colors.surface} 88%, ${colors.background})`
      : `color-mix(in srgb, ${colors.surface} 96%, ${colors.background})`;
  const mutedBlend =
    themePreset.mode === 'dark'
      ? `color-mix(in srgb, ${colors.surface} 78%, ${colors.background})`
      : `color-mix(in srgb, ${colors.surface} 84%, ${colors.background})`;
  const accentBlend =
    themePreset.mode === 'dark'
      ? `color-mix(in srgb, ${colors.primary} 22%, ${colors.surface})`
      : `color-mix(in srgb, ${colors.primary} 12%, ${colors.surface})`;
  const sidebarBlend =
    themePreset.mode === 'dark'
      ? `color-mix(in srgb, ${colors.surface} 86%, ${colors.background})`
      : `color-mix(in srgb, ${colors.surface} 94%, ${colors.background})`;
  const primaryForeground = themePreset.mode === 'dark' ? '#04131a' : '#ffffff';

  rootStyle.setProperty('--crm-color-primary', colors.primary);
  rootStyle.setProperty('--crm-color-primary-hover', colors.primaryHover);
  rootStyle.setProperty('--crm-color-secondary', colors.secondary);
  rootStyle.setProperty('--crm-color-accent', colors.accent);
  rootStyle.setProperty('--crm-color-text', colors.textPrimary);
  rootStyle.setProperty('--crm-color-text-muted', colors.textSecondary);
  rootStyle.setProperty('--crm-color-border', themePreset.mode === 'dark' ? '#334155' : '#dbe4f0');
  rootStyle.setProperty('--crm-color-surface', colors.surface);
  rootStyle.setProperty('--crm-color-background', colors.background);
  rootStyle.setProperty(
    '--crm-color-background-accent',
    themePreset.mode === 'dark' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(56, 189, 248, 0.1)',
  );
  rootStyle.setProperty('--crm-color-success', colors.success);
  rootStyle.setProperty('--crm-color-warning', colors.warning);
  rootStyle.setProperty('--crm-color-danger', colors.danger);
  rootStyle.setProperty('--crm-font-family', themePreset.fontFamily);
  rootStyle.setProperty('--crm-font-size-scale', String(fontSizeOption.scale));
  rootStyle.setProperty('--crm-root-font-size', `${100 * fontSizeOption.scale}%`);
  rootStyle.setProperty('--background', colors.background);
  rootStyle.setProperty('--foreground', colors.textPrimary);
  rootStyle.setProperty('--card', colors.surface);
  rootStyle.setProperty('--card-foreground', colors.textPrimary);
  rootStyle.setProperty('--popover', colors.surface);
  rootStyle.setProperty('--popover-foreground', colors.textPrimary);
  rootStyle.setProperty('--primary', colors.primary);
  rootStyle.setProperty('--primary-foreground', primaryForeground);
  rootStyle.setProperty('--secondary', surfaceBlend);
  rootStyle.setProperty('--secondary-foreground', colors.textPrimary);
  rootStyle.setProperty('--muted', mutedBlend);
  rootStyle.setProperty('--muted-foreground', colors.textSecondary);
  rootStyle.setProperty('--accent', accentBlend);
  rootStyle.setProperty('--accent-foreground', colors.textPrimary);
  rootStyle.setProperty('--destructive', colors.danger);
  rootStyle.setProperty('--border', themePreset.mode === 'dark' ? '#334155' : '#dbe4f0');
  rootStyle.setProperty('--input', themePreset.mode === 'dark' ? '#243247' : '#dbe4f0');
  rootStyle.setProperty('--ring', colors.accent);
  rootStyle.setProperty('--chart-1', colors.primary);
  rootStyle.setProperty('--chart-2', colors.accent);
  rootStyle.setProperty('--chart-3', colors.success);
  rootStyle.setProperty('--chart-4', colors.warning);
  rootStyle.setProperty('--chart-5', colors.secondary);
  rootStyle.setProperty('--sidebar', sidebarBlend);
  rootStyle.setProperty('--sidebar-foreground', colors.textPrimary);
  rootStyle.setProperty('--sidebar-primary', colors.primary);
  rootStyle.setProperty('--sidebar-primary-foreground', primaryForeground);
  rootStyle.setProperty('--sidebar-accent', accentBlend);
  rootStyle.setProperty('--sidebar-accent-foreground', colors.textPrimary);
  rootStyle.setProperty('--sidebar-border', themePreset.mode === 'dark' ? '#334155' : '#dbe4f0');
  rootStyle.setProperty('--sidebar-ring', colors.accent);
}

function ThemeProvider({ children }) {
  const { direction } = useLanguage();
  const [customization, setCustomization] = useState(getStoredCustomization);
  const themePreset = themePresets[customization.themeId] || themePresets.professionalBlue;
  const fontSizeOption =
    fontSizeOptions.find((option) => option.id === customization.fontSize) || fontSizeOptions[1];
  const theme = useMemo(
    () => createCrmTheme(themePreset, fontSizeOption, direction),
    [direction, fontSizeOption, themePreset],
  );

  useEffect(() => {
    document.documentElement.dataset.crmColorScheme = themePreset.mode;
    document.documentElement.dataset.crmTheme = themePreset.id;
    document.documentElement.dataset.crmFontSize = fontSizeOption.id;
    document.documentElement.classList.toggle('dark', themePreset.mode === 'dark');
    document.documentElement.style.colorScheme = themePreset.mode;
    applyCssVariables(themePreset, fontSizeOption);
    window.localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
  }, [customization, fontSizeOption, themePreset]);

  const colorModeValue = useMemo(
    () => ({
      mode: themePreset.mode,
      setMode(nextMode) {
        setCustomization((currentValue) => ({
          ...currentValue,
          themeId:
            nextMode === 'dark'
              ? themePresets.darkEnterprise.id
              : themePresets.professionalBlue.id,
        }));
      },
      toggleMode() {
        setCustomization((currentValue) => ({
          ...currentValue,
          themeId:
            themePresets[currentValue.themeId]?.mode === 'dark'
              ? themePresets.professionalBlue.id
              : themePresets.darkEnterprise.id,
        }));
      },
    }),
    [themePreset.mode],
  );

  const customizationValue = useMemo(
    () => ({
      ...customization,
      activeTheme: themePreset,
      activeFontSize: fontSizeOption,
      themeOptions,
      fontSizeOptions,
      defaultLogoSrc: DEFAULT_LOGO_SRC,
      setTheme(themeId) {
        setCustomization((currentValue) => ({
          ...currentValue,
          themeId: themePresets[themeId] ? themeId : currentValue.themeId,
        }));
      },
      setFontSize(fontSize) {
        setCustomization((currentValue) => ({
          ...currentValue,
          fontSize: fontSizeOptions.some((option) => option.id === fontSize)
            ? fontSize
            : currentValue.fontSize,
        }));
      },
      setLogoSrc(logoSrc) {
        setCustomization((currentValue) => ({
          ...currentValue,
          logoSrc: logoSrc || DEFAULT_LOGO_SRC,
        }));
      },
      resetLogo() {
        setCustomization((currentValue) => ({
          ...currentValue,
          logoSrc: DEFAULT_LOGO_SRC,
        }));
      },
    }),
    [customization, fontSizeOption, themePreset],
  );

  return (
    <ColorModeContext.Provider value={colorModeValue}>
      <PlatformCustomizationContext.Provider value={customizationValue}>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </PlatformCustomizationContext.Provider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const context = useContext(ColorModeContext);

  if (!context) {
    throw new Error('useColorMode must be used within ThemeProvider');
  }

  return context;
}

export function usePlatformCustomization() {
  const context = useContext(PlatformCustomizationContext);

  if (!context) {
    throw new Error('usePlatformCustomization must be used within ThemeProvider');
  }

  return context;
}

export default ThemeProvider;
