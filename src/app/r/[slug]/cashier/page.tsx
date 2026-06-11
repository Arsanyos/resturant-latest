import { notFound } from "next/navigation";
import { CashierDashboard } from "@/features/cashier/components/CashierDashboard";
import { getRestaurantBySlug } from "@/lib/restaurants/queries";

export default async function CashierPage({
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
    <CashierDashboard
      slug={slug}
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      currency={restaurant.currency}
    />
  );
}
