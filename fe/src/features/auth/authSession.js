const ACCESS_TOKEN_KEY = 'crm.auth.accessToken';
const REFRESH_TOKEN_KEY = 'crm.auth.refreshToken';
const USER_KEY = 'crm.auth.user';

let accessToken = readFromStorage(ACCESS_TOKEN_KEY);
let refreshToken = readFromStorage(REFRESH_TOKEN_KEY);
const listeners = new Set();

function readFromStorage(key) {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

function readUserFromStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function notify() {
  const payload = {
    accessToken,
    refreshToken,
    user: readUserFromStorage(),
  };

  listeners.forEach((listener) => {
    listener(payload);
  });
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function getStoredUser() {
  return readUserFromStorage();
}

export function setAuthSession({ accessToken: nextToken, refreshToken: nextRefreshToken, user } = {}) {
  const shouldUpdateAccessToken = nextToken !== undefined;
  const shouldUpdateRefreshToken = nextRefreshToken !== undefined;
  const shouldUpdateUser = user !== undefined;

  if (shouldUpdateAccessToken) {
    accessToken = nextToken ?? null;
  }

  if (shouldUpdateRefreshToken) {
    refreshToken = nextRefreshToken ?? null;
  }

  if (typeof window !== 'undefined') {
    if (shouldUpdateAccessToken) {
      if (accessToken) {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      } else {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    }

    if (shouldUpdateRefreshToken) {
      if (refreshToken) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }

    if (shouldUpdateUser) {
      if (user) {
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(USER_KEY);
      }
    }
  }

  notify();
}

export function clearAuthSession() {
  setAuthSession({
    accessToken: null,
    refreshToken: null,
    user: null,
  });
}

export function subscribeToAuthSession(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
