import { notFound } from "next/navigation";
import { WaiterDashboard } from "@/features/waiter/components/WaiterDashboard";
import { getRestaurantBySlug } from "@/lib/restaurants/queries";

export default async function WaiterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  return (
    <WaiterDashboard
      slug={slug}
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      currency={restaurant.currency}
    />
  );
}
