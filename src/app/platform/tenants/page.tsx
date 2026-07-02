import { PlatformLayout } from "@/features/platform-admin/components/PlatformLayout";
import { TenantTable } from "@/features/platform-admin/components/TenantTable";

export default function PlatformTenantsPage() {
  return (
    <PlatformLayout>
      <TenantTable />
    </PlatformLayout>
  );
}
