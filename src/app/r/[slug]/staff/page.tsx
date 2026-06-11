import { t } from "@/lib/i18n";
import { StaffLoginForm } from "@/features/staff/components/StaffLoginForm";

export default async function StaffLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-card border border-card-border bg-card p-8">
        <h1 className="text-2xl font-bold text-foreground">
          {t("staff.login")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{slug}</p>
        <StaffLoginForm slug={slug} />
      </div>
    </div>
  );
}
