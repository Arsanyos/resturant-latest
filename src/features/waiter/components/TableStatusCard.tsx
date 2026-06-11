"use client";

import { useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { WaiterTableSummary } from "../types";
import { TableStatusChip } from "./TableStatusChip";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn(
        "h-4 w-4 text-muted-foreground transition-transform",
        expanded && "rotate-180"
      )}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PulseDot({ urgent }: { urgent: boolean }) {
  const color = urgent ? "bg-danger" : "bg-warning";

  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
          color
        )}
      />
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", color)} />
    </span>
  );
}

export function TableStatusCard({
  table,
  selected,
  locale,
  onSelect,
}: {
  table: WaiterTableSummary;
  selected: boolean;
  locale: SupportedLocale;
  onSelect: (tableId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasAssistance =
    table.pendingAssistanceCount > 0 || table.status === "assistance_requested";
  const needsAttention =
    hasAssistance || table.status === "awaiting_payment";

  const waiterLabel =
    table.assignedWaiters.length > 0
      ? table.assignedWaiters.map((w) => w.name).join(", ")
      : t("waiter.unassigned", locale);

  return (
    <AppCard
      className={cn(
        "w-full self-start p-3 transition-shadow hover:shadow-md",
        selected && "ring-2 ring-primary",
        table.isAssignedToMe && "border-primary/40",
        hasAssistance && "border-danger/40",
        table.status === "awaiting_payment" &&
          !hasAssistance &&
          "border-warning/40"
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSelect(table.id)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground sm:text-base">
              {t("customer.table", locale)} {table.number}
            </span>
            {needsAttention && <PulseDot urgent={hasAssistance} />}
          </span>
        </button>

        <button
          type="button"
          aria-expanded={expanded}
          aria-label={
            expanded
              ? t("waiter.collapse_table", locale)
              : t("waiter.expand_table", locale)
          }
          onClick={() => setExpanded((open) => !open)}
          className="shrink-0 rounded-lg p-1 hover:bg-muted"
        >
          <ChevronIcon expanded={expanded} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-card-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <TableStatusChip status={table.status} locale={locale} />
            {table.label !== `Table ${table.number}` && (
              <span className="truncate text-sm text-muted-foreground">
                {table.label}
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              {t("waiter.capacity", locale)}: {table.capacity}
            </p>
            <p className="truncate">
              {t("waiter.assigned_to", locale)}: {waiterLabel}
            </p>
            {table.pendingAssistanceCount > 0 && (
              <p className="font-medium text-danger">
                {table.pendingAssistanceCount}{" "}
                {t("waiter.assistance_badge", locale)}
              </p>
            )}
            {table.session && (
              <p>
                {table.session.orderCount} {t("waiter.orders_count", locale)}
                {table.session.paymentStatus === "UNPAID" &&
                  table.status === "awaiting_payment" &&
                  ` · ${t("waiter.awaiting_payment", locale)}`}
              </p>
            )}
          </div>
        </div>
      )}
    </AppCard>
  );
}
