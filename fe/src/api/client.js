// Central HTTP client for the CMS API. Handles the base URL, bearer-token auth,
// JSON vs multipart bodies, and unwrapping the { success, data, meta } envelope.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

/* ---- Sessions, one per audience ---------------------------------------------

   Staff and learners share a user collection and one login endpoint, but they
   are two different sessions and must not share a token slot. With a single
   key, signing into /learn as a student overwrote the CMS admin's token, and
   logging out of either app logged you out of both.

   Which slot a request uses is derived from the URL rather than held in a
   module variable. Both route trees exist in one SPA and only one is mounted at
   a time, so the path IS the audience — and a derived value can't fall out of
   sync with the app that's actually on screen, which a mutable global can. */
export const SCOPES = { ADMIN: 'admin', LEARN: 'learn' };

const TOKEN_KEYS = {
  [SCOPES.ADMIN]: 'gp.admin.token',
  [SCOPES.LEARN]: 'gp.learn.token',
};

// Staff belong to the CMS session; instructors and students to the LMS one.
// Kept in step with be/src/constants/roles.js — STAFF_ROLES there.
const STAFF_ROLES = ['superadmin', 'editor', 'moderator'];

// Where a role's token belongs. The sign-in page is shared, so the ROLE that
// comes back decides which session is being started — not the page it was
// started from. A super admin signing in at /learn/login is starting a CMS
// session and is redirected there.
export function scopeForRole(role) {
  return STAFF_ROLES.includes(role) ? SCOPES.ADMIN : SCOPES.LEARN;
}

// The audience of whatever is on screen. The public site isn't a session of its
// own; its few authenticated reads belong to the learner.
export function currentScope() {
  if (typeof window === 'undefined') return SCOPES.LEARN;
  return window.location.pathname.startsWith('/admin') ? SCOPES.ADMIN : SCOPES.LEARN;
}

export function getToken(scope = currentScope()) {
  try {
    return localStorage.getItem(TOKEN_KEYS[scope] ?? TOKEN_KEYS[SCOPES.LEARN]);
  } catch {
    return null;
  }
}

export function setToken(token, scope = currentScope()) {
  const key = TOKEN_KEYS[scope] ?? TOKEN_KEYS[SCOPES.LEARN];
  try {
    if (token) localStorage.setItem(key, token);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearToken(scope = currentScope()) {
  setToken(null, scope);
}

// A thrown API error carries the HTTP status and any field-level errors so the
// UI can show inline messages.
export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function buildQuery(params) {
  if (!params) return '';
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.append(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// Core request. `body` may be a plain object (sent as JSON) or a FormData
// (sent as multipart — the browser sets the boundary Content-Type itself).
export async function request(
  path,
  { method = 'GET', body, params, headers = {}, auth = true, scope = currentScope() } = {},
) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const finalHeaders = { ...headers };
  if (!isForm && body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  const token = auth ? getToken(scope) : null;
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
    method,
    headers: finalHeaders,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.message ?? `Request failed (${res.status})`;
    // Only the session that made the call. Clearing both is what let a stale
    // LMS token sign the admin out of the CMS.
    if (res.status === 401) clearToken(scope);
    throw new ApiError(message, res.status, payload?.errors);
  }
  return payload; // { success, data, meta }
}

// Convenience wrappers that return the unwrapped `data` (and attach `meta`).
async function unwrap(promise) {
  const body = await promise;
  if (body && typeof body === 'object' && 'data' in body) {
    const { data, meta } = body;
    if (meta && data && typeof data === 'object') {
      try {
        Object.defineProperty(data, 'meta', { value: meta, enumerable: false });
      } catch {
        /* frozen/array — meta still available via getPage below */
      }
    }
    return data;
  }
  return body;
}

export const api = {
  get: (path, params, opts) => unwrap(request(path, { method: 'GET', params, ...opts })),
  post: (path, body, opts) => unwrap(request(path, { method: 'POST', body, ...opts })),
  patch: (path, body, opts) => unwrap(request(path, { method: 'PATCH', body, ...opts })),
  del: (path, opts) => unwrap(request(path, { method: 'DELETE', ...opts })),
  // Returns the full envelope so callers can read `meta` for pagination.
  page: (path, params, opts) => request(path, { method: 'GET', params, ...opts }),
  // Multipart upload (files). `fields` is an optional map of extra form fields.
  upload: (path, file, { fieldName = 'file', fields = {}, method = 'POST' } = {}) => {
    const form = new FormData();
    form.append(fieldName, file);
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    return unwrap(request(path, { method, body: form }));
  },
};

export { BASE_URL };
