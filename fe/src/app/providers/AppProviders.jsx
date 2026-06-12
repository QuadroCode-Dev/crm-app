import QueryProvider from './QueryProvider.jsx';
import AuthProvider from './AuthProvider.jsx';
import NotificationProvider from './NotificationProvider.jsx';
import LanguageProvider from './LanguageProvider.jsx';
import ThemeProvider from './ThemeProvider.jsx';

function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <QueryProvider>
          <NotificationProvider>
            <AuthProvider>{children}</AuthProvider>
          </NotificationProvider>
        </QueryProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default AppProviders;
