// Central HTTP client for the CMS API. Handles the base URL, bearer-token auth,
// JSON vs multipart bodies, and unwrapping the { success, data, meta } envelope.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

const TOKEN_KEY = 'gp.admin.token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearToken() {
  setToken(null);
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
export async function request(path, { method = 'GET', body, params, headers = {}, auth = true } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const finalHeaders = { ...headers };
  if (!isForm && body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  const token = auth ? getToken() : null;
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
    if (res.status === 401) clearToken();
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
