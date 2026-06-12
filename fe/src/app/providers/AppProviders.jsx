import QueryProvider from './QueryProvider.jsx';
import AuthProvider from './AuthProvider.jsx';
import NotificationProvider from './NotificationProvider.jsx';
import ThemeProvider from './ThemeProvider.jsx';

function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <NotificationProvider>
          <AuthProvider>{children}</AuthProvider>
        </NotificationProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default AppProviders;
