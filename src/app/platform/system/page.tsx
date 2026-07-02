import { PlatformLayout } from "@/features/platform-admin/components/PlatformLayout";
import { SystemHealth } from "@/features/platform-admin/components/SystemHealth";

export default function PlatformSystemPage() {
  return (
    <PlatformLayout>
      <SystemHealth />
    </PlatformLayout>
  );
}
