import { NextRequest, NextResponse } from "next/server";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { MenuUploadError, saveMenuImage } from "@/lib/menu/upload";

export async function POST(request: NextRequest) {
  try {
    const staff = await requireOwner();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const url = await saveMenuImage(staff.restaurantId, file);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof MenuUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Menu upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
