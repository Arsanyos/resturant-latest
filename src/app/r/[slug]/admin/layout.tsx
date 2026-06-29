import { notFound } from "next/navigation";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { getRestaurantBySlug } from "@/lib/restaurants/queries";

export default async function AdminRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    notFound();
  }

  return (
    <AdminLayout
      slug={slug}
      restaurantName={restaurant.name}
      restaurantLogoUrl={restaurant.logoUrl}
    >
      {children}
    </AdminLayout>
  );
}
