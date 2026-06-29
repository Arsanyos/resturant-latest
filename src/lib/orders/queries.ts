import { prisma } from "@/lib/db/prisma";

export async function getOrdersForSession(sessionId: string) {
  return prisma.order.findMany({
    where: { sessionId },
    orderBy: { orderNumber: "asc" },
    include: {
      items: {
        include: {
          menuItem: {
            select: { name: true },
          },
        },
      },
    },
  });
}

export async function getNextOrderNumber(sessionId: string) {
  const last = await prisma.order.findFirst({
    where: { sessionId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  return (last?.orderNumber ?? 0) + 1;
}
