import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('./lib/prisma.js');

const { default: app } = await import('./index.js');
const { prisma } = await import('./lib/prisma.js');

const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';
const AUTH_HEADERS = {
  'x-user-id': MOCK_ID,
  'x-user-email': 'pharmacist@hms.com',
  'x-user-role': 'PHARMACIST',
};

describe('Pharmacy Service - Workflow Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete order workflow: Create -> Confirm -> Ready', async () => {
    const payload = {
      patientId: MOCK_ID,
      items: [{ medicineId: MOCK_ID, medicineName: 'Aspirin', quantity: 1, unitPrice: 5 }],
      deliveryType: 'PICKUP'
    };

    // 1. Create
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => cb(prisma));
    vi.mocked(prisma.pharmacyOrder.create).mockResolvedValue({ id: MOCK_ID, status: 'PENDING', ...payload } as any);

    const res1 = await request(app).post('/pharmacy').set(AUTH_HEADERS).send(payload);
    expect(res1.status).toBe(201);
    expect(res1.body.status).toBe('PENDING');

    // 2. Confirm
    vi.mocked(prisma.pharmacyOrder.findUnique).mockResolvedValue(res1.body);
    vi.mocked(prisma.pharmacyOrder.update).mockResolvedValue({ ...res1.body, status: 'CONFIRMED' } as any);

    const res2 = await request(app).put(`/pharmacy/${MOCK_ID}/status`).set(AUTH_HEADERS).send({ status: 'CONFIRMED' });
    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe('CONFIRMED');

    // 2.5 Processing (Added because logic requires it)
    vi.mocked(prisma.pharmacyOrder.findUnique).mockResolvedValue(res2.body);
    vi.mocked(prisma.pharmacyOrder.update).mockResolvedValue({ ...res2.body, status: 'PROCESSING' } as any);

    const resProc = await request(app).put(`/pharmacy/${MOCK_ID}/status`).set(AUTH_HEADERS).send({ status: 'PROCESSING' });
    expect(resProc.status).toBe(200);

    // 3. Ready
    vi.mocked(prisma.pharmacyOrder.findUnique).mockResolvedValue(resProc.body);
    vi.mocked(prisma.pharmacyOrder.update).mockResolvedValue({ ...resProc.body, status: 'READY' } as any);

    const res3 = await request(app).put(`/pharmacy/${MOCK_ID}/status`).set(AUTH_HEADERS).send({ status: 'READY' });
    expect(res3.status).toBe(200);
    expect(res3.body.status).toBe('READY');
  });
});
