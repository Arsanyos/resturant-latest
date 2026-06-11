export const REALTIME_EVENTS = {
  ORDER_PLACED: "order.placed",
  ORDER_ITEM_STATUS_CHANGED: "order_item.status_changed",
  ORDER_ITEM_CANCELLED: "order_item.cancelled",
  SESSION_CLOSED: "session.closed",
  SESSION_STARTED: "session.started",
  ASSISTANCE_CREATED: "assistance.created",
  ASSISTANCE_UPDATED: "assistance.updated",
  TABLE_ASSIGNMENT_CHANGED: "table.assignment_changed",
  PAYMENT_UPDATED: "payment.updated",
  PAYMENT_COMPLETED: "payment.completed",
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export interface RealtimeEnvelope {
  event: RealtimeEventName;
  restaurantId: string;
  payload: Record<string, unknown>;
}
