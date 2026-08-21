// Single entry point for the CMS API. Import the resource you need:
//   import { coursesApi, authApi } from '../api';
import { api, BASE_URL } from './client.js';
import { createResource } from './resource.js';

// ---- Content ---------------------------------------------------------------
export const articlesApi = {
  ...createResource('articles'),
  uploadHero: (id, file) => api.upload(`/articles/${id}/hero-image`, file),
};

export const categoriesApi = createResource('categories');

export const coursesApi = {
  ...createResource('courses'),
  // The cover image is all a course record carries now. Videos, PDFs and
  // YouTube links are lesson content, authored in the LMS builder and gated per
  // lesson — see be/src/modules/courses/courses.routes.js.
  uploadImage: (id, file) => api.upload(`/courses/${id}/image`, file),
};

// Course bundles: several published courses sold together for less than their
// total. `listPrice`, `saving` and `savingPercent` come back computed from the
// courses' current prices — they are never stored, so they cannot go stale.
export const bundlesApi = {
  ...createResource('bundles'),
  uploadImage: (id, file) => api.upload(`/bundles/${id}/image`, file),
};

export const careersApi = {
  listOpenings: (params) => api.get('/careers/openings', params),
  createOpening: (body) => api.post('/careers/openings', body),
  updateOpening: (id, body) => api.patch(`/careers/openings/${id}`, body),
  removeOpening: (id) => api.del(`/careers/openings/${id}`),
};

export const rulesApi = createResource('rules');

// B2 — government panels and prequalification schemes, listed by jurisdiction
// on /government-panels and edited in Content → Government Panels.
export const panelsApi = createResource('panels');

// B4 — the AI Prompt Library: master prompts by topic, use case and tool.
export const promptsApi = createResource('prompts');

// B7 — Find a Bid Writer. The public read is held behind FEATURE_BID_WRITERS on
// the server; admin CRUD is always available so placements can be prepared.
export const bidWritersApi = {
  ...createResource('bid-writers'),
  uploadLogo: (id, file) => api.upload(`/bid-writers/${id}/logo`, file),
};

// B6 — the Templates library: sourced, licence-checked, downloadable documents.
export const templatesApi = {
  ...createResource('templates'),
  uploadFile: (id, file) => api.upload(`/templates/${id}/file`, file),
  // A plain URL rather than a fetch. The browser performs the download itself,
  // so middle-click and "save link as" behave the way a download should, and
  // the server's Content-Disposition names the file. Built from BASE_URL
  // because the API is not same-origin.
  downloadUrl: (id) => `${BASE_URL}/templates/${id}/download`,
};

// Tender portals listed on the Tender Websites page — name, subtitle, the three
// destination links and a logo.
export const tenderSitesApi = {
  ...createResource('tender-sites'),
  uploadLogo: (id, file) => api.upload(`/tender-sites/${id}/logo`, file),
};

export const homeHeroApi = {
  get: () => api.get('/home-hero'),
  save: (audience, body) => api.patch(`/home-hero/${audience}`, body),
};

// A hero's copy, held for the life of the tab. The heroes carry no built-in
// copy any more, so without this each would paint empty for the length of a
// round-trip every time a visitor navigated back to its page. Seeding the
// component's state from here means only the first visit waits; the request
// still goes out behind it, so an edit made in the CMS lands on the next load.
function createCopyCache() {
  let value = null;
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
  };
}

export const heroCopyCache = createCopyCache();

// The Capabilities page hero — eyebrow, heading and an optional sub-heading,
// held per audience segment exactly as the homepage hero is.
export const capabilitiesHeroApi = {
  get: () => api.get('/capabilities-hero'),
  save: (audience, body) => api.patch(`/capabilities-hero/${audience}`, body),
};

export const capabilitiesHeroCopyCache = createCopyCache();

// Cards in the "Deliver with Impact" row on the Capabilities page.
export const capabilitiesApi = {
  ...createResource('capabilities'),
  // The service photograph. Its own endpoints because the file has to be stored
  // before there is a URL to save — same shape as a team member's photo.
  uploadImage: (id, file) => api.upload(`/capabilities/${id}/image`, file),
  removeImage: (id) => api.del(`/capabilities/${id}/image`),
};

// A6 — versioned rule overlays for the Procurement Advisor.  is the
// public read the advisor makes; it returns null when nothing is published,
// which is a normal state — the built-in rule pack is complete on its own.
export const rulePacksApi = {
  ...createResource('rule-packs'),
  active: (jurisdiction) =>
    api.get(`/rule-packs/active/${jurisdiction}`, undefined, { auth: false }),
  publish: (id) => api.post(`/rule-packs/${id}/publish`),
};

export const capabilityCardsCache = createCopyCache();

export const teamApi = {
  ...createResource('team'),
  getBySlug: (slug) => api.get(`/team/slug/${slug}`),
  uploadPhoto: (id, file) => api.upload(`/team/${id}/photo`, file),
};
export const pagesApi = createResource('pages');

// ---- Forum Q&A + moderation ------------------------------------------------
export const questionsApi = {
  ...createResource('questions'),
  submit: (body) => api.post('/questions', body, { auth: false }),
  // Public forum reads. Sent without the CMS token so a signed-in admin sees
  // exactly what a visitor sees — published questions only.
  publicList: (params) => api.get('/questions', params, { auth: false }),
  publicGet: (id) => api.get(`/questions/${id}`, undefined, { auth: false }),
  publicGetBySlug: (slug) => api.get(`/questions/slug/${slug}`, undefined, { auth: false }),
  setStatus: (id, status, note) => api.patch(`/questions/${id}/status`, { status, note }),
  answer: (id, paragraphs, lessons) => api.patch(`/questions/${id}/answer`, { paragraphs, lessons }),
  sendAnswer: (id) => api.post(`/questions/${id}/send-answer`),
  setFeatured: (id, featured) => api.patch(`/questions/${id}/featured`, { featured }),
};

// ---- Public submissions ----------------------------------------------------
export const consultationsApi = {
  ...createResource('consultations'),
  submit: (body) => api.post('/consultations', body, { auth: false }),
};

export const registerInterestApi = {
  ...createResource('register-interest'),
  submit: (body) => api.post('/register-interest', body, { auth: false }),
  exportCsvUrl: '/register-interest/export',
};

export const subscribersApi = {
  ...createResource('subscribers'),
  subscribe: (body) => api.post('/subscribers', body, { auth: false }),
  confirm: (token) => api.get('/subscribers/confirm', { token }),
  unsubscribe: (payload) => api.post('/subscribers/unsubscribe', payload, { auth: false }),
};

// ---- Config / platform -----------------------------------------------------
export const linksApi = createResource('links');
export const mediaApi = {
  ...createResource('media'),
  upload: (file, fields) => api.upload('/media', file, { fields }),
};
export const announcementsApi = {
  ...createResource('announcements'),
  active: () => api.get('/announcements/active'),
};
export const settingsApi = {
  getPublic: () => api.get('/settings/public'),
  get: () => api.get('/settings'),
  update: (body) => api.patch('/settings', body),
};
export const usersApi = createResource('users');
export const dashboardApi = { get: () => api.get('/dashboard') };
export const auditApi = { page: (params) => api.page('/audit-log', params) };

// ---- Auth ------------------------------------------------------------------
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }, { auth: false }),
  me: () => api.get('/auth/me'),
  updateMe: (body) => api.patch('/auth/me', body),
  register: (body) => api.post('/auth/register', body),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }, { auth: false }),
};

export { api, BASE_URL } from './client.js';
export { getToken, setToken, clearToken, ApiError, SCOPES, scopeForRole, currentScope } from './client.js';
