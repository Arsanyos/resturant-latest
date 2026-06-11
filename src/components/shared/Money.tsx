import { formatETB } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Money({
  amount,
  currency = "ETB",
  className,
}: {
  amount: number;
  currency?: string;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>{formatETB(amount, currency)}</span>
  );
}
