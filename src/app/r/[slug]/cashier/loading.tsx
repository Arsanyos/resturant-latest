import { t } from "@/lib/i18n";

export default function CashierLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{t("common.loading")}</p>
    </div>
  );
}
