import { NextRequest, NextResponse } from "next/server";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { MenuUploadError, saveBrandLogo } from "@/lib/menu/upload";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const staff = await requireOwner(slug);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const url = await saveBrandLogo(staff.restaurantId, file);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof MenuUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Logo upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
