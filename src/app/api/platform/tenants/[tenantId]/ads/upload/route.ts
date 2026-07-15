import { NextRequest, NextResponse } from "next/server";
import {
  PlatformAuthError,
  requirePlatformAdmin,
} from "@/lib/platform-admin/auth";
import { MenuUploadError, saveAdImage } from "@/lib/menu/upload";
import { PlatformTenantError } from "@/lib/platform-admin/service";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { tenantId } = await context.params;

    const tenant = await prisma.restaurant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      throw new PlatformTenantError("Tenant not found", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const url = await saveAdImage(tenantId, file);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof PlatformAuthError || error instanceof MenuUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof PlatformTenantError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Tenant ad upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
