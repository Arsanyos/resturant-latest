import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import {
  deactivateStaffMember,
  StaffAdminError,
  updateStaffMember,
} from "@/lib/staff-admin/service";
import { updateStaffSchema } from "@/lib/validation/staff-admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ staffId: string }> }
) {
  try {
    const actor = await requireOwner();
    const { staffId } = await context.params;
    const body = await request.json();
    const input = updateStaffSchema.parse(body);
    const member = await updateStaffMember(staffId, input, actor);
    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof StaffAdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Staff PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ staffId: string }> }
) {
  try {
    const actor = await requireOwner();
    const { staffId } = await context.params;
    const member = await deactivateStaffMember(staffId, actor);
    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof StaffAdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Staff DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
