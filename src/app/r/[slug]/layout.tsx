import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/restaurants/queries";
import { RestaurantProvider } from "@/lib/restaurants/context";
import { serializeRestaurant } from "@/lib/restaurants/serialize";

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant || !restaurant.isActive) {
    notFound();
  }

  const restaurantData = serializeRestaurant(restaurant);

  return (
    <RestaurantProvider restaurant={restaurantData}>
      <div
        style={
          {
            "--primary": restaurant.primaryColor,
            "--secondary": restaurant.secondaryColor,
          } as React.CSSProperties
        }
        className="min-h-screen"
      >
        {children}
      </div>
    </RestaurantProvider>
  );
}
