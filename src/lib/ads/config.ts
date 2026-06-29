export type AdSlot = {
  id: string;
  clientId: string;
  slotId: string;
};

export function getAdSlots(): AdSlot[] {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "";
  const slots = (process.env.NEXT_PUBLIC_ADSENSE_SLOTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (clientId && slots.length > 0) {
    return slots.map((slotId, i) => ({
      id: `slot-${i}`,
      clientId,
      slotId,
    }));
  }

  return [
    { id: "demo-1", clientId: "", slotId: "" },
    { id: "demo-2", clientId: "", slotId: "" },
    { id: "demo-3", clientId: "", slotId: "" },
  ];
}
