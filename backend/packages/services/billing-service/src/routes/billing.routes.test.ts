import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../services/billing.service.js', () => ({
  billingService: {
    findAllInvoices: vi.fn(),
    findInvoiceById: vi.fn(),
    createInvoice: vi.fn(),
    addPayment: vi.fn(),
  },
}));

const { default: app } = await import('../index.js');
const { billingService } = await import('../services/billing.service.js');

const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_HEADERS = {
  'x-user-id': MOCK_ID,
  'x-user-email': 'billing@hms.com',
  'x-user-role': 'ADMIN',
};

describe('Billing Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /billing', () => {
    it('should return 200 and list', async () => {
      vi.mocked(billingService.findAllInvoices).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as any);
      const res = await request(app).get('/billing').set(AUTH_HEADERS);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /billing', () => {
    it('should return 201 on success', async () => {
      const payload = {
        patientId: MOCK_ID,
        hospitalId: MOCK_ID,
        subtotal: 100,
        totalAmount: 100,
        items: [{ type: 'CONSULTATION', description: 'General', unitPrice: 100, totalPrice: 100 }],
      };
      vi.mocked(billingService.createInvoice).mockResolvedValue({ id: MOCK_ID, ...payload } as any);
      const res = await request(app).post('/billing').set(AUTH_HEADERS).send(payload);
      expect(res.status).toBe(201);
    });
  });
});
