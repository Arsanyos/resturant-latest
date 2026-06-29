import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import {
  createCategory,
  getFullMenu,
  MenuError,
} from "@/lib/menu/service";
import { createCategorySchema } from "@/lib/validation/menu";

export async function GET() {
  try {
    const staff = await requireOwner();
    const data = await getFullMenu(staff.restaurantId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof MenuError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Menu GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireOwner();
    const body = await request.json();
    const input = createCategorySchema.parse(body);
    const category = await createCategory(staff.restaurantId, input, staff);
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
    console.error("Menu POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
