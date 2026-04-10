/**
 * @fileoverview Realtime REST Routes
 * @description REST endpoints for triggering WebSocket broadcasts from other services
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '@hms/common-middleware';
import { realtimeService } from '../services/realtime.service.js';

const router: IRouter = Router();

// ── Zod Schemas ────────────────────────────────────────

const emitSchema = z.object({
  channel: z.string().min(1),
  event: z.string().min(1),
  data: z.unknown(),
});

const broadcastSchema = z.object({
  event: z.string().min(1),
  data: z.unknown(),
});

// ── Routes ─────────────────────────────────────────────

// Emit to a specific channel
router.post(
  '/emit',
  validate(emitSchema),
  asyncHandler(async (req, res) => {
    const { channel, event, data } = req.body;
    realtimeService.broadcast(channel, event, data);
    res.json({ success: true, channel, event });
  }),
);

// Broadcast to all connected clients
router.post(
  '/broadcast',
  validate(broadcastSchema),
  asyncHandler(async (req, res) => {
    const { event, data } = req.body;
    realtimeService.broadcastAll(event, data);
    res.json({ success: true, event });
  }),
);

// Get connection stats
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json({
      connectedClients: realtimeService.getConnectedClients(),
      channels: realtimeService.getChannelCount(),
    });
  }),
);

export default router;
