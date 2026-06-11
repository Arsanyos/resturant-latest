import { t } from "@/lib/i18n";

export default function CustomerLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background px-4 py-6">
      <div className="animate-pulse space-y-4">
        <div className="h-16 rounded-card bg-muted" />
        <div className="h-24 rounded-card bg-muted" />
        <div className="h-24 rounded-card bg-muted" />
        <div className="h-24 rounded-card bg-muted" />
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("common.loading")}
      </p>
    </div>
  );
}
