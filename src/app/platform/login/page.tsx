import { PlatformLoginForm } from "@/features/platform-admin/components/PlatformLoginForm";

export default function PlatformLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-card border border-card-border bg-card p-8">
        <h1 className="text-2xl font-bold text-foreground">Platform Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to the control plane
        </p>
        <PlatformLoginForm />
      </div>
    </div>
  );
}
