export function formatETB(amount: number, currency = "ETB"): string {
  const formatted = new Intl.NumberFormat("en-ET", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currency} ${formatted}`;
}

export function parseETB(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeTotals(
  subtotal: number,
  taxPct: number,
  servicePct: number
) {
  const serviceCharge = (subtotal * servicePct) / 100;
  const taxable = subtotal + serviceCharge;
  const tax = (taxable * taxPct) / 100;
  const totalDue = subtotal + serviceCharge + tax;

  return {
    subtotal,
    serviceCharge,
    tax,
    totalDue,
  };
}
