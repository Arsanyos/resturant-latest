import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { TableError, updateTable } from "@/lib/tables/service";
import { updateTableSchema } from "@/lib/validation/table";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tableId: string }> }
) {
  try {
    const staff = await requireOwner();
    const { tableId } = await context.params;
    const body = await request.json();
    const input = updateTableSchema.parse(body);
    const table = await updateTable(tableId, input, staff);
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
    console.error("Table PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
