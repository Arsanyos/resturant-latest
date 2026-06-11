"use client";

import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CashierSessionSummary } from "../types";
import { SessionStatusChip } from "./SessionStatusChip";

export function SessionList({
  sessions,
  selectedSessionId,
  currency,
  locale,
  onSelect,
}: {
  sessions: CashierSessionSummary[];
  selectedSessionId: string | null;
  currency: string;
  locale: SupportedLocale;
  onSelect: (sessionId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <button
          key={session.sessionId}
          type="button"
          onClick={() => onSelect(session.sessionId)}
          className="w-full text-left"
        >
          <AppCard
            className={cn(
              "transition-shadow hover:shadow-md",
              selectedSessionId === session.sessionId && "ring-2 ring-primary"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">
                  {t("customer.table", locale)} {session.tableNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {session.tableLabel}
                </p>
              </div>
              <SessionStatusChip chip={session.chip} locale={locale} />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("cashier.balance", locale)}
              </span>
              <Money amount={session.balance} currency={currency} />
            </div>
          </AppCard>
        </button>
      ))}
    </div>
  );
}
