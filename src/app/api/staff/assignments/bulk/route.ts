import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { BulkAssignError, bulkAssignTables } from "@/lib/waiter/bulk-assign";
import { bulkAssignmentSchema } from "@/lib/validation/admin";

export async function POST(request: NextRequest) {
  try {
    const staff = await requireOwner();
    const body = await request.json();
    const input = bulkAssignmentSchema.parse(body);
    const result = await bulkAssignTables(staff, input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof BulkAssignError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Bulk assign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
