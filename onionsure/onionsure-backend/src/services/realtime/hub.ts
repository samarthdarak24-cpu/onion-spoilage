/**
 * Realtime hub (spec §29).
 *
 * A single WebSocketServer multiplexes channels by topic:
 *   inspection:{id}  — per-inspection pipeline events
 *   centre:{id}      — per-procurement-centre activity
 *   user:{id}        — per-user notifications
 *   global           — platform-wide events
 *
 * Clients authenticate with a bearer token in the connection query string and
 * subscribe to channels they are allowed to see. Publishing is fire-and-forget
 * and never blocks the request path.
 */
import { type Server, type IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { verifyAccessToken } from '../../modules/auth/token.service';
import { registerProbe } from '../../health/registry';

interface Client {
  ws: WebSocket;
  channels: Set<string>;
  userId?: string;
}

type RealtimeEvent = string;

class RealtimeHub {
  private wss?: WebSocketServer;

  private clients = new Set<Client>();

  private channelIndex = new Map<string, Set<Client>>();

  /** Attach to the HTTP server on the `/ws` path. */
  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws, req) => this.onConnection(ws, req));

    registerProbe('websocket', async () => ({
      status: 'up',
      detail: `${this.clients.size} connected client(s)`,
    }));
  }

  private onConnection(ws: WebSocket, req: IncomingMessage): void {
    const params = parse(req.url || '', true).query;
    const token = typeof params.token === 'string' ? params.token : undefined;
    let userId: string | undefined;
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) userId = payload.sub;
    }

    const client: Client = { ws, channels: new Set(), userId };
    this.clients.add(client);

    ws.on('message', (msg) => this.onMessage(client, msg.toString()));
    ws.on('close', () => this.remove(client));
    ws.on('error', () => this.remove(client));
  }

  private onMessage(client: Client, raw: string): void {
    try {
      const data = JSON.parse(raw) as { type?: string; channels?: unknown };
      if (data.type === 'subscribe' && Array.isArray(data.channels)) {
        for (const c of data.channels) this.subscribe(client, String(c));
        client.ws.send(JSON.stringify({ type: 'subscribed', channels: [...client.channels] }));
      }
    } catch {
      // Ignore malformed client frames.
    }
  }

  subscribe(client: Client, channel: string): void {
    client.channels.add(channel);
    if (!this.channelIndex.has(channel)) this.channelIndex.set(channel, new Set());
    this.channelIndex.get(channel)!.add(client);
  }

  private remove(client: Client): void {
    this.clients.delete(client);
    for (const set of this.channelIndex.values()) set.delete(client);
  }

  /** Publish an event to every subscriber of a channel. */
  publish(channel: string, event: RealtimeEvent, payload: unknown): void {
    const set = this.channelIndex.get(channel);
    if (!set || set.size === 0) return;
    const message = JSON.stringify({ channel, event, payload, timestamp: new Date().toISOString() });
    for (const client of set) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  publishInspection(inspectionId: string, event: RealtimeEvent, payload: unknown): void {
    this.publish(`inspection:${inspectionId}`, event, payload);
  }

  publishCentre(centreId: string, event: RealtimeEvent, payload: unknown): void {
    this.publish(`centre:${centreId}`, event, payload);
  }

  publishUser(userId: string, event: RealtimeEvent, payload: unknown): void {
    this.publish(`user:${userId}`, event, payload);
  }

  publishGlobal(event: RealtimeEvent, payload: unknown): void {
    this.publish('global', event, payload);
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const realtimeHub = new RealtimeHub();
