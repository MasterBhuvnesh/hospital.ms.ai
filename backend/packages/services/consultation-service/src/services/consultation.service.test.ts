import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────
vi.mock('../lib/prisma.js');
vi.mock('../lib/metrics.js', () => ({
  consultationCreatedCounter: { inc: vi.fn() },
  vitalsRecordedCounter: { inc: vi.fn() },
  notesAddedCounter: { inc: vi.fn() },
  default: { contentType: 'text/plain', metrics: vi.fn() },
}));

const { prisma } = await import('../lib/prisma.js');
const { consultationService } = await import('./consultation.service.js');
const { consultationCreatedCounter, vitalsRecordedCounter, notesAddedCounter } = await import('../lib/metrics.js');

// ── Helpers ────────────────────────────────────────────
const NOW = new Date();
const MOCK_ID = '550e8400-e29b-41d4-a716-446655440000';

function fakeConsultation(overrides = {}) {
  return {
    id: MOCK_ID,
    patientId: MOCK_ID,
    doctorId: MOCK_ID,
    hospitalId: MOCK_ID,
    status: 'WAITING',
    isPriority: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────

describe('consultationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a consultation and increment metric', async () => {
      const data = {
        patientId: MOCK_ID,
        doctorId: MOCK_ID,
        hospitalId: MOCK_ID,
      };

      vi.mocked(prisma.consultation.create).mockResolvedValue(fakeConsultation(data) as any);

      const result = await consultationService.create(data);

      expect(prisma.consultation.create).toHaveBeenCalled();
      expect(consultationCreatedCounter.inc).toHaveBeenCalledWith({
        hospital_id: data.hospitalId,
        status: 'WAITING',
      });
      expect(result.status).toBe('WAITING');
    });
  });

  describe('updateStatus', () => {
    it('should update status and increment metric', async () => {
      const mockConsultation = fakeConsultation();
      vi.mocked(prisma.consultation.findUnique).mockResolvedValue(mockConsultation as any);
      vi.mocked(prisma.consultation.update).mockResolvedValue({ ...mockConsultation, status: 'WITH_DOCTOR' } as any);

      await consultationService.updateStatus(MOCK_ID, 'WITH_DOCTOR');

      expect(prisma.consultation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'WITH_DOCTOR' }),
        })
      );
      expect(consultationCreatedCounter.inc).toHaveBeenCalledWith({
        hospital_id: mockConsultation.hospitalId,
        status: 'WITH_DOCTOR',
      });
    });
  });

  describe('addNote', () => {
    it('should add a note and increment metric', async () => {
      vi.mocked(prisma.consultation.findUnique).mockResolvedValue(fakeConsultation() as any);
      vi.mocked(prisma.consultationNote.create).mockResolvedValue({ id: 'note-1' } as any);

      await consultationService.addNote(MOCK_ID, { subjective: 'Patient feels better' });

      expect(prisma.consultationNote.create).toHaveBeenCalled();
      expect(notesAddedCounter.inc).toHaveBeenCalled();
    });
  });

  describe('recordVitals', () => {
    it('should record vitals and increment metric', async () => {
      vi.mocked(prisma.consultation.findUnique).mockResolvedValue(fakeConsultation() as any);
      vi.mocked(prisma.vital.create).mockResolvedValue({ id: 'vital-1' } as any);

      await consultationService.recordVitals(MOCK_ID, { temperature: 36.6 });

      expect(prisma.vital.create).toHaveBeenCalled();
      expect(vitalsRecordedCounter.inc).toHaveBeenCalled();
    });
  });
});
