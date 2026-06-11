import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError, requireStaff } from "@/lib/auth/require-staff";
import { updateAssistanceRequest, WaiterError } from "@/lib/waiter/service";
import { assistanceUpdateSchema } from "@/lib/validation/waiter";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const staff = await requireStaff({ action: "access_waiter" });
    const { requestId } = await context.params;
    const body = await request.json();
    const input = assistanceUpdateSchema.parse(body);
    const updated = await updateAssistanceRequest(requestId, input, staff);
    return NextResponse.json(updated);
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
    console.error("Assistance update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
