import { cn } from "@/lib/utils";

export function AppCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-card-border bg-card p-4 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
