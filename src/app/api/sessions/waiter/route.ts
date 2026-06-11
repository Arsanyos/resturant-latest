import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { resolveRestaurantBySlug } from "@/lib/restaurants/service";
import { getTableByRestaurantAndNumber } from "@/lib/restaurants/queries";
import { publishRealtimeEvent } from "@/lib/realtime/publisher";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { createWaiterSession } from "@/lib/sessions/service";
import {
  assertStaffCanMutateTable,
  WaiterError,
} from "@/lib/waiter/service";
import { waiterSessionSchema } from "@/lib/validation/waiter";

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff({ action: "access_waiter" });
    const body = await request.json();
    const input = waiterSessionSchema.parse(body);

    if (staff.restaurantSlug !== input.restaurantSlug) {
      throw new WaiterError("Forbidden", 403);
    }

    const restaurant = await resolveRestaurantBySlug(input.restaurantSlug);
    if (!restaurant) {
      throw new WaiterError("Restaurant not found", 404);
    }

    const table = await getTableByRestaurantAndNumber(
      restaurant.id,
      input.tableNumber
    );
    if (!table || !table.isActive) {
      throw new WaiterError("Table not found", 404);
    }

    await assertStaffCanMutateTable(staff, table.id);

    const session = await createWaiterSession(
      table.id,
      staff.staffId,
      restaurant.id
    );

    await publishRealtimeEvent({
      event: REALTIME_EVENTS.SESSION_STARTED,
      restaurantId: restaurant.id,
      payload: {
        sessionId: session.id,
        tableId: table.id,
        tableNumber: table.number,
        startedByType: "WAITER",
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      tableNumber: table.number,
      startedByType: session.startedByType,
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof WaiterError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "TABLE_HAS_ACTIVE_SESSION") {
      return NextResponse.json(
        { error: "Table already has an active session" },
        { status: 409 }
      );
    }
    console.error("Waiter session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
