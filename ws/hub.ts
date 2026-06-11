import { WebSocket, WebSocketServer } from "ws";
import type { RealtimeEnvelope } from "../src/lib/realtime/events";

interface ClientSubscription {
  restaurantId: string;
  topics: Set<string>;
}

export class RealtimeHub {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientSubscription>();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.wss.on("connection", (ws) => this.handleConnection(ws));
  }

  private handleConnection(ws: WebSocket) {
    const subscription: ClientSubscription = {
      restaurantId: "",
      topics: new Set(),
    };
    this.clients.set(ws, subscription);

    ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as {
          type: string;
          restaurantId?: string;
          topics?: string[];
        };

        if (message.type === "subscribe" && message.restaurantId) {
          subscription.restaurantId = message.restaurantId;
          subscription.topics = new Set(message.topics ?? ["*"]);
          ws.send(JSON.stringify({ type: "subscribed", ok: true }));
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    ws.on("close", () => {
      this.clients.delete(ws);
    });
  }

  publish(envelope: RealtimeEnvelope) {
    const payload = JSON.stringify(envelope);

    for (const [ws, sub] of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      if (sub.restaurantId !== envelope.restaurantId) continue;
      if (!sub.topics.has("*") && !sub.topics.has(envelope.event)) continue;
      ws.send(payload);
    }
  }

  clientCount() {
    return this.clients.size;
  }
}
