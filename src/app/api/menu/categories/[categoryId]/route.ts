import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { deleteCategory, MenuError, updateCategory } from "@/lib/menu/service";
import { updateCategorySchema } from "@/lib/validation/menu";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> }
) {
  try {
    const staff = await requireOwner();
    const { categoryId } = await context.params;
    const body = await request.json();
    const input = updateCategorySchema.parse(body);
    const category = await updateCategory(categoryId, input, staff);
    return NextResponse.json(category);
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
    console.error("Category PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ categoryId: string }> }
) {
  try {
    const staff = await requireOwner();
    const { categoryId } = await context.params;
    const result = await deleteCategory(categoryId, staff);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof MenuError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Category DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
