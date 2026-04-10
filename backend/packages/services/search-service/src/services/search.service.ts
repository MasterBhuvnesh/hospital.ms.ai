/**
 * @fileoverview Search Service (Stub)
 * @description Stateless search aggregation — returns structured empty results.
 *              The real implementation will proxy to other services via HTTP.
 */

export const searchService = {
  // ── Doctor Search ──────────────────────────────────────

  async searchDoctors(query: {
    name?: string;
    specialization?: string;
    hospitalId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    // TODO: proxy to doctor-service
    return { data: [], total: 0, page, limit };
  },

  // ── Hospital Search ────────────────────────────────────

  async searchHospitals(query: {
    name?: string;
    city?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    // TODO: proxy to hospital-service
    return { data: [], total: 0, page, limit };
  },

  // ── Medicine Search ────────────────────────────────────

  async searchMedicines(query: {
    name?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    // TODO: proxy to pharmacy-service / inventory-service
    return { data: [], total: 0, page, limit };
  },

  // ── Lab Test Search ────────────────────────────────────

  async searchLabTests(query: {
    name?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    // TODO: proxy to lab-test-service
    return { data: [], total: 0, page, limit };
  },
};
