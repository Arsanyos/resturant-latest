import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { InventoryError, updateIngredient } from "@/lib/inventory/service";
import { updateIngredientSchema } from "@/lib/validation/inventory";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ ingredientId: string }> }
) {
  try {
    const staff = await requireOwner();
    const { ingredientId } = await context.params;
    const body = await request.json();
    const input = updateIngredientSchema.parse(body);
    const ingredient = await updateIngredient(ingredientId, input, staff);
    return NextResponse.json(ingredient);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof InventoryError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Inventory PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
