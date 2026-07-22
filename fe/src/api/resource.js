import { api } from './client.js';

// Builds a standard CRUD client for a REST resource mounted at `/<base>`.
// Every entity gets list/page/get/getBySlug/create/update/remove for free;
// modules add custom endpoints on top (see index.js).
export function createResource(base) {
  return {
    // Returns the unwrapped array of items.
    list: (params) => api.get(`/${base}`, params),
    // Returns the full { data, meta } envelope for paginated admin tables.
    page: (params) => api.page(`/${base}`, params),
    get: (id) => api.get(`/${base}/${id}`),
    getBySlug: (slug) => api.get(`/${base}/slug/${slug}`),
    create: (body) => api.post(`/${base}`, body),
    update: (id, body) => api.patch(`/${base}/${id}`, body),
    remove: (id) => api.del(`/${base}/${id}`),
    // Upload a file to a sub-route, e.g. uploadTo('123/hero-image', file).
    uploadTo: (subPath, file, opts) => api.upload(`/${base}/${subPath}`, file, opts),
  };
}
