import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/metrics.js', () => ({
  searchOperations: { inc: vi.fn() },
}));

const { searchService } = await import('./search.service.js');
const { searchOperations } = await import('../lib/metrics.js');

// ── Tests ──────────────────────────────────────────────

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchDoctors', () => {
    it('should return empty results and increment metric', async () => {
      const result = await searchService.searchDoctors({});
      expect(result.data).toEqual([]);
      expect(searchOperations.inc).toHaveBeenCalledWith({ type: 'doctor', status: 'success' });
    });
  });

  describe('searchHospitals', () => {
    it('should return empty results and increment metric', async () => {
      const result = await searchService.searchHospitals({});
      expect(result.data).toEqual([]);
      expect(searchOperations.inc).toHaveBeenCalledWith({ type: 'hospital', status: 'success' });
    });
  });
});
