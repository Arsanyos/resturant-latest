import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/sessions/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const session = await getSessionById(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    tableId: session.tableId,
    status: session.status,
    startedByType: session.startedByType,
    startedAt: session.startedAt.toISOString(),
    restaurantSlug: session.table.restaurant.slug,
    tableNumber: session.table.number,
  });
}
