import { notFound } from "next/navigation";
import { KdsBoard } from "@/features/kitchen/components/KdsBoard";
import { getRestaurantBySlug } from "@/lib/restaurants/queries";

export default async function KitchenPage({
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
    <KdsBoard
      slug={slug}
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
    />
  );
}
