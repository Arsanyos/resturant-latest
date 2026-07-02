import { PlatformLayout } from "@/features/platform-admin/components/PlatformLayout";
import { TenantDetail } from "@/features/platform-admin/components/TenantDetail";

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  return (
    <PlatformLayout>
      <TenantDetail tenantId={tenantId} />
    </PlatformLayout>
  );
}
