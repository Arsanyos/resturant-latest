import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { MenuError, reorderCategories } from "@/lib/menu/service";
import { reorderCategoriesSchema } from "@/lib/validation/menu";

export async function POST(request: NextRequest) {
  try {
    const staff = await requireOwner();
    const body = await request.json();
    const input = reorderCategoriesSchema.parse(body);
    const result = await reorderCategories(
      staff.restaurantId,
      input,
      staff
    );
    return NextResponse.json(result);
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
    console.error("Category reorder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
