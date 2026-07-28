// Single entry point for the CMS API. Import the resource you need:
//   import { coursesApi, authApi } from '../api';
import { api } from './client.js';
import { createResource } from './resource.js';

// ---- Content ---------------------------------------------------------------
export const articlesApi = {
  ...createResource('articles'),
  uploadHero: (id, file) => api.upload(`/articles/${id}/hero-image`, file),
};

export const categoriesApi = createResource('categories');

export const coursesApi = {
  ...createResource('courses'),
  uploadImage: (id, file) => api.upload(`/courses/${id}/image`, file),
  // Course materials attached directly to a course: uploaded video/pdf/image,
  // or a pasted YouTube link.
  addMedia: (id, file, fields) => api.upload(`/courses/${id}/media`, file, { fields }),
  addMediaLink: (id, body) => api.post(`/courses/${id}/media/link`, body),
  removeMedia: (id, mediaId) => api.del(`/courses/${id}/media/${mediaId}`),
};

export const faqsApi = createResource('faqs');
export const pagesApi = createResource('pages');

// ---- Forum Q&A + moderation ------------------------------------------------
export const questionsApi = {
  ...createResource('questions'),
  submit: (body) => api.post('/questions', body, { auth: false }),
  setStatus: (id, status, note) => api.patch(`/questions/${id}/status`, { status, note }),
  answer: (id, paragraphs, lessons) => api.patch(`/questions/${id}/answer`, { paragraphs, lessons }),
  setFeatured: (id, featured) => api.patch(`/questions/${id}/featured`, { featured }),
};

// ---- Public submissions ----------------------------------------------------
export const contactApi = {
  ...createResource('contact'),
  submit: (body) => api.post('/contact', body, { auth: false }),
};

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
export { getToken, setToken, clearToken, ApiError } from './client.js';
