import { AuditLogTable } from "@/features/admin/components/AuditLogTable";

export default async function AdminAuditLogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AuditLogTable slug={slug} />;
}
