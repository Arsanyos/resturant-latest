import { t } from "@/lib/i18n";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold text-foreground">
        {t("admin.title")}
      </h1>
    </div>
  );
}
