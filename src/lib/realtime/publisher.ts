import type { RealtimeEnvelope } from "./events";

export async function publishRealtimeEvent(envelope: RealtimeEnvelope) {
  const hubUrl = process.env.WS_HUB_URL;
  if (!hubUrl) return;

  const httpUrl = hubUrl
    .replace(/^ws:/, "http:")
    .replace(/^wss:/, "https:")
    .replace(/\/realtime$/, "/publish");

  try {
    await fetch(httpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
  } catch (error) {
    console.error("Failed to publish realtime event:", error);
  }
}
