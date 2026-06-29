import { DashboardSummary } from "@/features/admin/components/DashboardSummary";
import { getRestaurantBySlug } from "@/lib/restaurants/queries";
import { notFound } from "next/navigation";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <DashboardSummary slug={slug} currency={restaurant.currency} />
  );
}
