import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../lib/metrics.js', () => ({
  appointmentCreatedCounter: { inc: vi.fn() },
  default: { contentType: 'text/plain', metrics: vi.fn() },
}));

const { prisma } = await import('../lib/prisma.js');
const { appointmentService } = await import('./appointment.service.js');
const { appointmentCreatedCounter } = await import('../lib/metrics.js');

// ── Helpers ────────────────────────────────────────────
const NOW = new Date();
const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';

function fakeAppointment(overrides = {}) {
  return {
    id: MOCK_ID,
    patientId: MOCK_ID,
    doctorId: MOCK_ID,
    hospitalId: MOCK_ID,
    appointmentDate: NOW,
    slotTime: '10:00',
    status: 'SCHEDULED',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('appointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create an appointment and increment metric', async () => {
      const data = {
        patientId: MOCK_ID,
        doctorId: MOCK_ID,
        hospitalId: MOCK_ID,
        appointmentDate: '2025-01-01',
        slotTime: '10:00',
      };

      vi.mocked(prisma.appointment.create).mockResolvedValue(fakeAppointment(data) as any);

      const result = await appointmentService.create(data);

      expect(prisma.appointment.create).toHaveBeenCalled();
      expect(appointmentCreatedCounter.inc).toHaveBeenCalledWith({
        hospital_id: data.hospitalId,
        status: 'SCHEDULED',
      });
      expect(result.status).toBe('SCHEDULED');
    });
  });

  describe('updateStatus', () => {
    it('should update status and increment metric', async () => {
      const mockAppt = fakeAppointment();
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue(mockAppt as any);
      vi.mocked(prisma.appointment.update).mockResolvedValue({ ...mockAppt, status: 'CONFIRMED' } as any);

      await appointmentService.updateStatus(MOCK_ID, 'CONFIRMED');

      expect(prisma.appointment.update).toHaveBeenCalled();
      expect(appointmentCreatedCounter.inc).toHaveBeenCalledWith({
        hospital_id: mockAppt.hospitalId,
        status: 'CONFIRMED',
      });
    });
  });

  describe('Waitlist', () => {
    it('should add to waitlist', async () => {
      vi.mocked(prisma.waitlist.create).mockResolvedValue({ id: 'w-1' } as any);
      await appointmentService.addToWaitlist({
        patientId: MOCK_ID,
        doctorId: MOCK_ID,
        hospitalId: MOCK_ID,
        date: '2025-01-01',
      });
      expect(prisma.waitlist.create).toHaveBeenCalled();
    });
  });
});
