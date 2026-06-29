import { SettingsForm } from "@/features/admin/components/SettingsForm";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SettingsForm slug={slug} />;
}
