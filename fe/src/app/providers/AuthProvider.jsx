import { createContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as loginRequest, logout as logoutRequest } from '../../api/authApi.js';
import LoadingState from '../../shared/components/feedback/LoadingState.jsx';
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  setAuthSession,
  subscribeToAuthSession,
} from '../../features/auth/authSession.js';

export const AuthContext = createContext({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => {},
  logout: async () => {},
});

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthSession(({ user: nextUser, accessToken }) => {
      if (!accessToken && !nextUser) {
        setUser(null);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      const accessToken = getAccessToken();

      if (!accessToken) {
        clearAuthSession();
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getMe();

        if (!isMounted) {
          return;
        }

        setAuthSession({
          accessToken,
          user: currentUser,
        });
        setUser(currentUser);
      } catch {
        if (!isMounted) {
          return;
        }

        clearAuthSession();
        setUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  async function login(credentials) {
    const response = await loginRequest(credentials);

    setAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    });

    const currentUser = response.user ?? (await getMe());

    setAuthSession({
      user: currentUser,
    });
    setUser(currentUser);
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      clearAuthSession();
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      isLoading,
      user,
      login,
      logout,
    }),
    [isLoading, user],
  );

  if (isLoading) {
    return <LoadingState />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
