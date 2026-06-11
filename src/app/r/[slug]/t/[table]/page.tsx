import { CustomerBootstrapView } from "@/features/customer/components/CustomerBootstrapView";

export default async function CustomerTablePage({
  params,
}: {
  params: Promise<{ slug: string; table: string }>;
}) {
  const { slug, table } = await params;
  const tableNumber = Number(table);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <CustomerBootstrapView slug={slug} tableNumber={tableNumber} />
    </div>
  );
}
