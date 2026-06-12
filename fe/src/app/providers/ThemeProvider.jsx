import {
  CssBaseline,
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from '@mui/material';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import useLanguage from '../../shared/hooks/useLanguage.js';

const COLOR_MODE_STORAGE_KEY = 'crm.preferences.colorMode';

const ColorModeContext = createContext(null);

function getStoredColorMode() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedMode = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  return storedMode === 'dark' ? 'dark' : 'light';
}

function createCrmTheme(mode, direction) {
  const isDark = mode === 'dark';

  return createTheme({
    direction,
    palette: {
      mode,
      primary: {
        main: isDark ? '#7aa2ff' : '#2458e6',
      },
      secondary: {
        main: isDark ? '#ff9b6f' : '#f26b3a',
      },
      background: {
        default: isDark ? '#101624' : '#eef3f8',
        paper: isDark ? '#182235' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f3f7ff' : '#172033',
        secondary: isDark ? '#aab7cf' : '#52607a',
      },
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
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
            color: isDark ? '#c8d4ea' : '#52607a',
            '&.Mui-focused': {
              color: isDark ? '#9db9ff' : '#2458e6',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#141d2e' : '#ffffff',
            color: isDark ? '#f3f7ff' : '#172033',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#34445f' : '#dbe4f0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#5976a8' : '#9eb2d4',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#7aa2ff' : '#2458e6',
            },
            '&.Mui-disabled': {
              backgroundColor: isDark ? '#111827' : '#f4f7fb',
              color: isDark ? '#7d8aa3' : '#8b96a8',
            },
          },
          input: {
            '&::placeholder': {
              color: isDark ? '#9aa8bf' : '#7a879b',
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
            color: isDark ? '#d7e2f5' : '#52607a',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? '#182235' : '#ffffff',
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: isDark ? '#9db9ff' : '#52607a',
          },
        },
      },
    },
  });
}

function ThemeProvider({ children }) {
  const { direction } = useLanguage();
  const [mode, setMode] = useState(getStoredColorMode);
  const theme = useMemo(() => createCrmTheme(mode, direction), [direction, mode]);

  useEffect(() => {
    document.documentElement.dataset.crmColorScheme = mode;
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  }, [mode]);

  const colorModeValue = useMemo(
    () => ({
      mode,
      setMode(nextMode) {
        setMode(nextMode === 'dark' ? 'dark' : 'light');
      },
      toggleMode() {
        setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
      },
    }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorModeValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
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

export default ThemeProvider;
