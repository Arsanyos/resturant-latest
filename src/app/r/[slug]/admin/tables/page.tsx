import { TableManager } from "@/features/admin/components/TableManager";

export default async function AdminTablesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TableManager slug={slug} />;
}
