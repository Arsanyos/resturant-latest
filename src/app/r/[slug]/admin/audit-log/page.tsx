import { t } from "@/lib/i18n";

export default function AdminAuditLogPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold text-foreground">
        {t("admin.audit_log")}
      </h1>
    </div>
  );
}
