import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2458e6',
    },
    secondary: {
      main: '#f26b3a',
    },
    background: {
      default: '#eef3f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#172033',
      secondary: '#52607a',
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
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
        },
      },
    },
  },
});

function ThemeProvider({ children }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export default ThemeProvider;
