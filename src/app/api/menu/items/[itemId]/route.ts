import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import {
  deleteMenuItem,
  MenuError,
  updateMenuItem,
} from "@/lib/menu/service";
import { updateMenuItemSchema } from "@/lib/validation/menu";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const staff = await requireOwner();
    const { itemId } = await context.params;
    const body = await request.json();
    const input = updateMenuItemSchema.parse(body);
    const item = await updateMenuItem(itemId, input, staff);
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof MenuError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Menu item PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const staff = await requireOwner();
    const { itemId } = await context.params;
    const result = await deleteMenuItem(itemId, staff);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof MenuError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Menu item DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
