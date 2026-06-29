import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import {
  createStaffMember,
  listStaff,
  StaffAdminError,
} from "@/lib/staff-admin/service";
import { createStaffSchema } from "@/lib/validation/staff-admin";

export async function GET() {
  try {
    const staff = await requireOwner();
    const data = await listStaff(staff.restaurantId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof StaffAdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Staff GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireOwner();
    const body = await request.json();
    const input = createStaffSchema.parse(body);
    const member = await createStaffMember(staff.restaurantId, input, staff);
    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof StaffAdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    console.error("Staff POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
