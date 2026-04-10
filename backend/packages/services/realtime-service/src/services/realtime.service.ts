/**
 * @fileoverview Realtime WebSocket Service
 * @description Manages WebSocket connections, channels, and broadcasting
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '@hms/common-logging';
import type { Server, IncomingMessage } from 'node:http';

const logger = createLogger({
  serviceName: 'realtime-service',
  level: 'info',
  enableConsole: true,
  enableFile: false,
});

interface ClientInfo {
  ws: WebSocket;
  channels: Set<string>;
  isAlive: boolean;
}

interface SubscribeMessage {
  type: 'subscribe';
  channels: string[];
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  channels: string[];
}

type ClientMessage = SubscribeMessage | UnsubscribeMessage;

class RealtimeService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private clientIdCounter = 0;

  /**
   * Attach WebSocketServer to the HTTP server and set up event handlers
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server });

    logger.info('WebSocket server initialized');

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();

      const clientInfo: ClientInfo = {
        ws,
        channels: new Set(),
        isAlive: true,
      };

      this.clients.set(clientId, clientInfo);

      logger.info('Client connected', {
        clientId,
        remoteAddress: req.socket.remoteAddress,
        totalClients: this.clients.size,
      });

      ws.on('pong', () => {
        clientInfo.isAlive = true;
      });

      ws.on('message', (raw: Buffer | string) => {
        this.handleMessage(clientId, raw);
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error: Error) => {
        logger.error('WebSocket client error', {
          clientId,
          error: error.message,
        });
      });
    });

    this.wss.on('error', (error: Error) => {
      logger.error('WebSocket server error', { error: error.message });
    });

    // Ping/pong keepalive every 30 seconds
    this.pingInterval = setInterval(() => {
      this.clients.forEach((clientInfo, clientId) => {
        if (!clientInfo.isAlive) {
          logger.info('Terminating unresponsive client', { clientId });
          clientInfo.ws.terminate();
          this.handleDisconnect(clientId);
          return;
        }

        clientInfo.isAlive = false;
        clientInfo.ws.ping();
      });
    }, 30_000);
  }

  /**
   * Broadcast a message to all clients subscribed to a specific channel
   */
  broadcast(channel: string, event: string, data: unknown): void {
    const subscriberIds = this.channels.get(channel);
    if (!subscriberIds || subscriberIds.size === 0) {
      logger.info('No subscribers for channel', { channel, event });
      return;
    }

    const message = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    for (const clientId of subscriberIds) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
        sentCount++;
      }
    }

    logger.info('Broadcast to channel', { channel, event, sentCount });
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcastAll(event: string, data: unknown): void {
    const message = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    this.clients.forEach((clientInfo) => {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        clientInfo.ws.send(message);
        sentCount++;
      }
    });

    logger.info('Broadcast to all clients', { event, sentCount });
  }

  /**
   * Returns the count of currently connected clients
   */
  getConnectedClients(): number {
    return this.clients.size;
  }

  /**
   * Returns the count of active channels
   */
  getChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Handle an incoming message from a client
   */
  private handleMessage(clientId: string, raw: Buffer | string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch {
      logger.warn('Invalid JSON from client', { clientId });
      return;
    }

    if (parsed.type === 'subscribe' && Array.isArray(parsed.channels)) {
      for (const channel of parsed.channels) {
        if (typeof channel !== 'string') continue;
        client.channels.add(channel);

        if (!this.channels.has(channel)) {
          this.channels.set(channel, new Set());
        }
        this.channels.get(channel)!.add(clientId);
      }

      logger.info('Client subscribed to channels', {
        clientId,
        channels: parsed.channels,
      });
    } else if (parsed.type === 'unsubscribe' && Array.isArray(parsed.channels)) {
      for (const channel of parsed.channels) {
        if (typeof channel !== 'string') continue;
        client.channels.delete(channel);

        const channelSet = this.channels.get(channel);
        if (channelSet) {
          channelSet.delete(clientId);
          if (channelSet.size === 0) {
            this.channels.delete(channel);
          }
        }
      }

      logger.info('Client unsubscribed from channels', {
        clientId,
        channels: parsed.channels,
      });
    } else {
      logger.warn('Unknown message type from client', {
        clientId,
        type: (parsed as unknown as Record<string, unknown>).type,
      });
    }
  }

  /**
   * Handle client disconnection and clean up channel subscriptions
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove client from all channels
    for (const channel of client.channels) {
      const channelSet = this.channels.get(channel);
      if (channelSet) {
        channelSet.delete(clientId);
        if (channelSet.size === 0) {
          this.channels.delete(channel);
        }
      }
    }

    this.clients.delete(clientId);

    logger.info('Client disconnected', {
      clientId,
      totalClients: this.clients.size,
    });
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    this.clientIdCounter++;
    return `client_${Date.now()}_${this.clientIdCounter}`;
  }
}

export const realtimeService = new RealtimeService();
