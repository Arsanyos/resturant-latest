import { createServer } from "http";
import { WebSocketServer } from "ws";
import type { RealtimeEnvelope } from "../src/lib/realtime/events";
import { RealtimeHub } from "./hub";

const PORT = 3001;

const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === "/publish" && req.method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    try {
      const body = JSON.parse(
        Buffer.concat(chunks).toString()
      ) as RealtimeEnvelope;
      hub.publish(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid payload" }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: "/realtime" });
const hub = new RealtimeHub(wss);

server.listen(PORT, () => {
  console.log(`WebSocket hub listening on ws://localhost:${PORT}/realtime`);
});

export { hub };
