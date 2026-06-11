import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { assignTable, WaiterError } from "@/lib/waiter/service";
import { staffAssignmentSchema } from "@/lib/validation/waiter";

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff({ action: "access_waiter" });
    const body = await request.json();
    const input = staffAssignmentSchema.parse(body);
    const assignment = await assignTable(staff, input);
    return NextResponse.json(assignment);
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
    console.error("Assign table error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
