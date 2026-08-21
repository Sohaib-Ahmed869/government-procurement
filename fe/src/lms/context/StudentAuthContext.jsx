import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, getToken, setToken, clearToken, SCOPES, scopeForRole } from '../../api';
import { accountsApi } from '../../api/lms.js';

const StudentAuthContext = createContext(null);

// Where each role belongs. Mirrors homeFor() in the backend's accounts
// controller. The server sends `home` with the session and this is the
// fallback for when it hasn't.
export const HOME_FOR = {
  superadmin: '/admin',
  editor: '/admin',
  moderator: '/admin',
  instructor: '/learn/instructor',
  student: '/learn',
};

export function homeFor(role) {
  return HOME_FOR[role] ?? '/learn';
}

// Holds the signed-in LMS user. Student or instructor.
//
// It differs from the CMS's AuthContext in one way: being signed out is a
// normal state here, not an error. Parts of the LMS are public by design. The
// catalogue and free preview lessons (L1), so this resolves to `user: null`
// and lets each route decide what to gate.
export function StudentAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Loads the session. Tries /accounts/me first because it returns the
  // instructor profile alongside the user; falls back to /auth/me so a CMS
  // session opened at /learn still resolves.
  const hydrate = useCallback(async () => {
    try {
      const data = await accountsApi.me();
      setUser(data.user);
      setInstructor(data.instructor ?? null);
      return data.user;
    } catch {
      try {
        const me = await authApi.me();
        setUser(me);
        setInstructor(null);
        return me;
      } catch {
        clearToken(SCOPES.LEARN);
        setUser(null);
        setInstructor(null);
        return null;
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getToken(SCOPES.LEARN)) {
        setLoading(false);
        return;
      }
      await hydrate();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [hydrate]);

  // This is the single sign-in page for everyone, so the ROLE that comes back
  // decides which session was actually started, not the page it started from.
  // A super admin signing in here is opening a CMS session: their token goes to
  // the admin slot, and LoginPage sends them to /admin, where AuthProvider
  // reads it. Storing it under the learner slot would land them in the CMS with
  // no token at all.
  const login = useCallback(
    async (email, password) => {
      const { user: u, token } = await authApi.login(email, password);
      const scope = scopeForRole(u.role);
      setToken(token, scope);

      if (scope !== SCOPES.LEARN) return u;

      // Re-read through /accounts/me so an instructor's profile arrives with
      // the session rather than one render later.
      const full = await hydrate();
      return full ?? u;
    },
    [hydrate],
  );

  // Signup can only ever create a learner. The server rejects any other role,
  // but the scope is derived rather than assumed, so this stays correct if that
  // ever changes.
  const signup = useCallback(async (body) => {
    const { user: u, token } = await accountsApi.signup(body);
    setToken(token, scopeForRole(u.role));
    setUser(u);
    // A brand-new instructor has a profile, but it is empty and pending,
    // no need for a second request to learn that.
    setInstructor(body.role === 'instructor' ? { status: 'pending', canPublish: false } : null);
    return u;
  }, []);

  // An instructor editing their own details. The session holds a copy (it
  // arrives with /accounts/me so the shell can render in one request), so the
  // save has to update it here rather than leaving the header and the byline
  // quoting the old headline until the next reload.
  const saveInstructorProfile = useCallback(async (body) => {
    const next = await accountsApi.updateInstructorProfile(body);
    setInstructor(next);
    return next;
  }, []);

  // Signing out from a gated screen would be bounced to the login page by
  // StudentRoute anyway, but from a public one (the catalogue, say) nothing
  // would move and the click would look like it failed. Navigating here makes
  // it the same action wherever it is pressed. `replace` so Back doesn't return
  // to a screen the session no longer covers.
  const logout = useCallback(() => {
    // The learner session only. A CMS session in another tab belongs to a
    // different sign-in and is left alone.
    clearToken(SCOPES.LEARN);
    setUser(null);
    setInstructor(null);
    navigate('/learn/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      instructor,
      loading,
      isAuthenticated: Boolean(user),
      isInstructor: user?.role === 'instructor',
      isStudent: user?.role === 'student',
      home: homeFor(user?.role),
      login,
      signup,
      logout,
      saveInstructorProfile,
      // TODO (L6): back this with the enrolment record once it exists.
      isEnrolled: () => Boolean(user),
    }),
    [user, instructor, loading, login, signup, logout, saveInstructorProfile],
  );

  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth() {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  return ctx;
}
