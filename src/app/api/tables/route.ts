import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import {
  createTable,
  listTables,
  TableError,
} from "@/lib/tables/service";
import { createTableSchema } from "@/lib/validation/table";

export async function GET() {
  try {
    const staff = await requireOwner();
    const data = await listTables(staff.restaurantId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof TableError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Tables GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireOwner();
    const body = await request.json();
    const input = createTableSchema.parse(body);
    const table = await createTable(staff.restaurantId, input, staff);
    return NextResponse.json(table);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof TableError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Tables POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
