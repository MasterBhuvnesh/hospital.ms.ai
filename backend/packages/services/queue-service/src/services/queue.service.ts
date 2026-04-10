import { prisma } from '../lib/prisma.js';
import { AppError } from '@hms/common-middleware';

// ── Helpers ──────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

const PRIORITY_ORDER: Record<string, number> = {
  EMERGENCY: 0,
  DISABLED: 1,
  PREGNANT: 2,
  ELDERLY: 3,
  NORMAL: 4,
};

// ── Service ──────────────────────────────────────────

export const queueService = {
  // ── Token generation ─────────────────────────────────

  async generateToken(data: {
    patientId: string;
    doctorId: string;
    hospitalId: string;
    appointmentId?: string;
    queueType?: 'OPD' | 'EMERGENCY' | 'FOLLOW_UP';
    priority?: 'NORMAL' | 'ELDERLY' | 'PREGNANT' | 'DISABLED' | 'EMERGENCY';
  }) {
    const config = await queueService.getConfig(data.hospitalId, data.doctorId);
    const prefix = config?.tokenPrefix || 'A';

    const startOfDay = startOfToday();
    const endOfDay = endOfToday();

    const todayCount = await prisma.queueToken.count({
      where: {
        doctorId: data.doctorId,
        hospitalId: data.hospitalId,
        generatedAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    if (config && todayCount >= config.maxQueueSize) {
      throw new AppError('Queue is full for today', 400);
    }

    const tokenNumber = `${prefix}-${todayCount + 1}`;
    const position = todayCount + 1;

    return prisma.queueToken.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        hospitalId: data.hospitalId,
        appointmentId: data.appointmentId,
        tokenNumber,
        queueType: data.queueType || 'OPD',
        priority: data.priority || 'NORMAL',
        status: 'WAITING',
        position,
      },
    });
  },

  // ── Get live queue ───────────────────────────────────

  async getQueue(doctorId: string, hospitalId: string) {
    const startOfDay = startOfToday();
    const endOfDay = endOfToday();

    const tokens = await prisma.queueToken.findMany({
      where: {
        doctorId,
        hospitalId,
        status: { in: ['WAITING', 'CALLED'] },
        generatedAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: [{ position: 'asc' }],
    });

    // Sort by priority first, then position
    tokens.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] ?? 4;
      const pB = PRIORITY_ORDER[b.priority] ?? 4;
      if (pA !== pB) return pA - pB;
      return a.position - b.position;
    });

    return tokens;
  },

  // ── Call next patient ────────────────────────────────

  async callNext(doctorId: string, hospitalId: string) {
    const startOfDay = startOfToday();
    const endOfDay = endOfToday();

    const waitingTokens = await prisma.queueToken.findMany({
      where: {
        doctorId,
        hospitalId,
        status: 'WAITING',
        generatedAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: [{ position: 'asc' }],
    });

    if (waitingTokens.length === 0) {
      throw new AppError('No waiting tokens in queue', 404);
    }

    // Pick highest priority first, then lowest position
    waitingTokens.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] ?? 4;
      const pB = PRIORITY_ORDER[b.priority] ?? 4;
      if (pA !== pB) return pA - pB;
      return a.position - b.position;
    });

    const nextToken = waitingTokens[0];

    return prisma.queueToken.update({
      where: { id: nextToken.id },
      data: {
        status: 'CALLED',
        calledAt: new Date(),
      },
    });
  },

  // ── Update token status ──────────────────────────────

  async updateStatus(
    tokenId: string,
    status: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED',
  ) {
    const token = await prisma.queueToken.findUnique({ where: { id: tokenId } });
    if (!token) {
      throw new AppError('Token not found', 404);
    }

    const updateData: any = { status };
    if (status === 'CALLED') {
      updateData.calledAt = new Date();
    }
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    return prisma.queueToken.update({
      where: { id: tokenId },
      data: updateData,
    });
  },

  // ── Skip token ───────────────────────────────────────

  async skipToken(tokenId: string) {
    const token = await prisma.queueToken.findUnique({ where: { id: tokenId } });
    if (!token) {
      throw new AppError('Token not found', 404);
    }

    const startOfDay = startOfToday();
    const endOfDay = endOfToday();

    // Find the max position for today to move skipped token to the end
    const lastToken = await prisma.queueToken.findFirst({
      where: {
        doctorId: token.doctorId,
        hospitalId: token.hospitalId,
        generatedAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { position: 'desc' },
    });

    const newPosition = (lastToken?.position ?? 0) + 1;

    return prisma.queueToken.update({
      where: { id: tokenId },
      data: {
        status: 'SKIPPED',
        position: newPosition,
      },
    });
  },

  // ── Complete token ───────────────────────────────────

  async completeToken(tokenId: string) {
    const token = await prisma.queueToken.findUnique({ where: { id: tokenId } });
    if (!token) {
      throw new AppError('Token not found', 404);
    }

    return prisma.queueToken.update({
      where: { id: tokenId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  },

  // ── Get token status with estimated wait ─────────────

  async getTokenStatus(tokenId: string) {
    const token = await prisma.queueToken.findUnique({ where: { id: tokenId } });
    if (!token) {
      throw new AppError('Token not found', 404);
    }

    let estimatedWaitMins: number | null = null;

    if (token.status === 'WAITING') {
      const startOfDay = startOfToday();
      const endOfDay = endOfToday();

      const aheadCount = await prisma.queueToken.count({
        where: {
          doctorId: token.doctorId,
          hospitalId: token.hospitalId,
          status: { in: ['WAITING', 'CALLED'] },
          generatedAt: { gte: startOfDay, lt: endOfDay },
          position: { lt: token.position },
        },
      });

      const config = await queueService.getConfig(token.hospitalId, token.doctorId);
      const avgMins = config?.avgConsultationMins ?? 15;
      estimatedWaitMins = aheadCount * avgMins;
    }

    return { ...token, estimatedWaitMins };
  },

  // ── Estimated wait for new patients ──────────────────

  async getEstimatedWait(doctorId: string, hospitalId: string) {
    const startOfDay = startOfToday();
    const endOfDay = endOfToday();

    const waitingCount = await prisma.queueToken.count({
      where: {
        doctorId,
        hospitalId,
        status: { in: ['WAITING', 'CALLED'] },
        generatedAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    const config = await queueService.getConfig(hospitalId, doctorId);
    const avgMins = config?.avgConsultationMins ?? 15;

    return {
      waitingCount,
      estimatedWaitMins: waitingCount * avgMins,
    };
  },

  // ── Config ───────────────────────────────────────────

  async getConfig(hospitalId: string, doctorId: string) {
    return prisma.queueConfig.findUnique({
      where: {
        hospitalId_doctorId: { hospitalId, doctorId },
      },
    });
  },

  async upsertConfig(data: {
    hospitalId: string;
    doctorId: string;
    tokenPrefix?: string;
    avgConsultationMins?: number;
    maxQueueSize?: number;
    notifyBeforePositions?: number;
  }) {
    return prisma.queueConfig.upsert({
      where: {
        hospitalId_doctorId: {
          hospitalId: data.hospitalId,
          doctorId: data.doctorId,
        },
      },
      update: {
        tokenPrefix: data.tokenPrefix,
        avgConsultationMins: data.avgConsultationMins,
        maxQueueSize: data.maxQueueSize,
        notifyBeforePositions: data.notifyBeforePositions,
      },
      create: {
        hospitalId: data.hospitalId,
        doctorId: data.doctorId,
        tokenPrefix: data.tokenPrefix ?? 'A',
        avgConsultationMins: data.avgConsultationMins ?? 15,
        maxQueueSize: data.maxQueueSize ?? 50,
        notifyBeforePositions: data.notifyBeforePositions ?? 3,
      },
    });
  },
};
