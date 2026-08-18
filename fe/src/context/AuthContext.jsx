import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authApi, getToken, setToken, clearToken, SCOPES } from '../api';

const AuthContext = createContext(null);

// Holds the signed-in admin user. On mount, if a token exists, it validates it
// by calling /auth/me so a stale token logs the user out cleanly.
//
// Every token call names SCOPES.ADMIN rather than relying on the URL-derived
// default. This provider only ever mounts under /admin so the two agree today,
// but a session this explicit can't be re-homed by accident.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getToken(SCOPES.ADMIN)) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (alive) setUser(me);
      } catch {
        clearToken(SCOPES.ADMIN);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: u, token } = await authApi.login(email, password);
    setToken(token, SCOPES.ADMIN);
    setUser(u);
    return u;
  }, []);

  // Clears the CMS session only. A learner session in another tab is a separate
  // sign-in and is left alone.
  const logout = useCallback(() => {
    clearToken(SCOPES.ADMIN);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      // Convenience role checks used by the sidebar / route guards.
      hasRole: (...roles) => Boolean(user && roles.flat().includes(user.role)),
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
