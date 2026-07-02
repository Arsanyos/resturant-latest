import { PlatformLayout } from "@/features/platform-admin/components/PlatformLayout";
import { TenantCreateForm } from "@/features/platform-admin/components/TenantCreateForm";

export default function PlatformTenantCreatePage() {
  return (
    <PlatformLayout>
      <TenantCreateForm />
    </PlatformLayout>
  );
}
