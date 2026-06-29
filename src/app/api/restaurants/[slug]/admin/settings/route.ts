import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { AdminError, getSettings, updateSettings } from "@/lib/admin/service";
import { updateSettingsSchema } from "@/lib/validation/admin";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    await requireOwner(slug);
    const data = await getSettings(slug);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof AdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const staff = await requireOwner(slug);
    const body = await request.json();
    const input = updateSettingsSchema.parse(body);
    const data = await updateSettings(slug, input, staff.staffId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof AdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
