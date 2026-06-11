"use client";

import type { SupportedLocale } from "@/lib/i18n";
import type { WaiterTableSummary } from "../types";
import { TableStatusCard } from "./TableStatusCard";

export function TableGrid({
  tables,
  selectedTableId,
  locale,
  onSelect,
}: {
  tables: WaiterTableSummary[];
  selectedTableId: string | null;
  locale: SupportedLocale;
  onSelect: (tableId: string) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 items-start gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {tables.map((table) => (
        <TableStatusCard
          key={table.id}
          table={table}
          selected={selectedTableId === table.id}
          locale={locale}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
