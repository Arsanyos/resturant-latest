"use client";

import { KitchenStatus } from "@prisma/client";
import { t, type SupportedLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StatusActionButton({
  status,
  locale,
  updating,
  onAdvance,
}: {
  status: KitchenStatus;
  locale: SupportedLocale;
  updating: boolean;
  onAdvance: (next: KitchenStatus) => void;
}) {
  if (status === KitchenStatus.CANCELLED || status === KitchenStatus.SERVED) {
    return null;
  }

  const next =
    status === KitchenStatus.PENDING
      ? KitchenStatus.BEING_PREPARED
      : KitchenStatus.SERVED;

  const labelKey =
    status === KitchenStatus.PENDING
      ? "kitchen.action.prepare"
      : "kitchen.action.serve";

  const style =
    status === KitchenStatus.PENDING
      ? "bg-warning text-white hover:opacity-90"
      : "bg-success text-white hover:opacity-90";

  return (
    <button
      type="button"
      disabled={updating}
      onClick={() => onAdvance(next)}
      className={cn(
        "min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60",
        style
      )}
    >
      {updating ? t("common.loading", locale) : t(labelKey, locale)}
    </button>
  );
}
