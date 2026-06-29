import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import {
  createIngredient,
  createRecipe,
  getInventoryList,
  InventoryError,
  updateIngredient,
} from "@/lib/inventory/service";
import {
  createIngredientSchema,
  createRecipeSchema,
} from "@/lib/validation/inventory";

export async function GET() {
  try {
    const staff = await requireOwner();
    const data = await getInventoryList(staff.restaurantId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof InventoryError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireOwner();
    const body = await request.json();

    if (body.menuItemId && body.ingredientId) {
      const input = createRecipeSchema.parse(body);
      const recipe = await createRecipe(input, staff);
      return NextResponse.json(recipe);
    }

    const input = createIngredientSchema.parse(body);
    const ingredient = await createIngredient(
      staff.restaurantId,
      input,
      staff
    );
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
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
