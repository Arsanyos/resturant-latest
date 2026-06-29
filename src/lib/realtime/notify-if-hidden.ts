export function notifyIfHidden(title: string, body?: string) {
  if (typeof document === "undefined" || !document.hidden) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  new Notification(title, body ? { body } : undefined);
}
